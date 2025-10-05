from __future__ import annotations

import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler, StandardScaler

try:  # pragma: no cover - optional dependency
    import lightgbm as lgb
except ImportError:  # pragma: no cover - optional dependency
    lgb = None

from .common import (
    FEATURE_COLUMNS,
    MODEL_FILENAME,
    MISSION_SPECS,
    PREPROCESSOR_FILENAME,
    MissionSpec,
    iter_csv_records,
    safe_float,
)

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)
warnings.filterwarnings("ignore")


@dataclass
class TrainConfig:
    datasets_dir: Path
    model_dir: Path
    include_candidates: bool = False
    n_splits: int = 5

    @classmethod
    def from_args(cls, *, datasets_dir: str, model_dir: str, include_candidates: bool, n_splits: int) -> "TrainConfig":
        return cls(
            datasets_dir=Path(datasets_dir),
            model_dir=Path(model_dir),
            include_candidates=include_candidates,
            n_splits=n_splits,
        )


def load_mission(spec: MissionSpec, datasets_dir: Path) -> pd.DataFrame:
    rows: List[Dict[str, float]] = []
    path = spec.resolve_path(datasets_dir)
    if not path.exists():
        raise FileNotFoundError(f"Mission dataset not found at '{path}'.")

    for raw in iter_csv_records(path):
        if spec.requires_default_flag:
            if (raw.get("default_flag") or "").strip() not in {"1", "TRUE", "true"}:
                continue
        label_value = (raw.get(spec.label_field) or "").strip().upper()
        if not label_value:
            continue
        if label_value in spec.positive_labels:
            label = 1
            is_candidate = False
        elif label_value in spec.negative_labels:
            label = 0
            is_candidate = False
        elif label_value in spec.candidate_labels:
            label = 1
            is_candidate = True
        else:
            continue
        record = {feature: safe_float(raw.get(source)) for feature, source in spec.feature_map.items()}
        if all(np.isnan(value) for value in record.values()):
            continue
        record["label"] = label
        record["is_candidate"] = is_candidate
        record["mission"] = spec.name
        record["dataset_type"] = spec.dataset_type
        record["disposition"] = label_value
        rows.append(record)

    columns = (
        list(spec.feature_map.keys())
        + ["label", "is_candidate", "mission", "dataset_type", "disposition"]
    )
    if not rows:
        return pd.DataFrame(columns=columns)
    return pd.DataFrame(rows, columns=columns)


def load_all_missions(datasets_dir: Path) -> Dict[str, pd.DataFrame]:
    frames: Dict[str, pd.DataFrame] = {}
    for spec in MISSION_SPECS:
        frame = load_mission(spec, datasets_dir)
        if not frame.empty:
            frames[spec.name] = frame
    if not frames:
        raise RuntimeError("No data loaded; check file paths and formats.")
    return frames


def load_training_frame(datasets_dir: Path, include_candidates: bool) -> pd.DataFrame:
    mission_frames = load_all_missions(datasets_dir)
    processed = []
    for frame in mission_frames.values():
        if frame.empty:
            continue
        filtered = frame if include_candidates else frame[~frame["is_candidate"]].copy()
        if filtered.empty:
            continue
        processed.append(filtered)

    if not processed:
        raise RuntimeError("No data available after filtering. Check dataset availability and filters.")

    combined = pd.concat(processed, ignore_index=True)
    feature_cols = FEATURE_COLUMNS + [
        "label",
        "is_candidate",
        "mission",
        "dataset_type",
        "disposition",
    ]
    return combined[feature_cols]


def compute_metrics(y_true: np.ndarray, probabilities: np.ndarray) -> Dict[str, float]:
    preds = (probabilities >= 0.5).astype(int)
    return {
        "accuracy": accuracy_score(y_true, preds),
        "roc_auc": roc_auc_score(y_true, probabilities),
        "avg_precision": average_precision_score(y_true, probabilities),
        "brier": brier_score_loss(y_true, probabilities),
    }


def print_metrics(model_name: str, metrics: Dict[str, float]) -> None:
    print(
        f"{model_name:<12} accuracy={metrics['accuracy']:.3f} "
        f"roc_auc={metrics['roc_auc']:.3f} avg_precision={metrics['avg_precision']:.3f} "
        f"brier={metrics['brier']:.3f}"
    )


def train_lightgbm(
    X_train: np.ndarray,
    y_train: np.ndarray,
    w_train: np.ndarray,
):
    if lgb is None:
        print("LightGBM is not installed; skipping.")
        return None

    model = lgb.LGBMClassifier(
        n_estimators=400,
        learning_rate=0.03,
        num_leaves=48,
        min_child_samples=40,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.0,
        reg_lambda=1.0,
        random_state=RANDOM_SEED,
        verbosity=-1,
        n_jobs=-1,
    )
    model.fit(X_train, y_train, sample_weight=w_train)
    return model


def build_preprocessor(dataset_type: str) -> Pipeline:
    if dataset_type == "kepler":
        steps = [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    else:
        steps = [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler(quantile_range=(10.0, 90.0))),
        ]
    return Pipeline(steps)


def fit_group_pipelines(features: pd.DataFrame, dataset_types: np.ndarray) -> Dict[str, Pipeline]:
    pipelines: Dict[str, Pipeline] = {}
    if len(features) != len(dataset_types):
        raise ValueError("features and dataset_types must align in length.")

    features = features.reset_index(drop=True)
    dataset_types = np.asarray(dataset_types)

    unique_types = sorted({dtype for dtype in dataset_types})
    for dtype in unique_types:
        mask = dataset_types == dtype
        if not np.any(mask):
            continue
        pipeline = build_preprocessor(dtype)
        pipeline.fit(features.loc[mask, FEATURE_COLUMNS])
        pipelines[dtype] = pipeline

    if not pipelines:
        raise RuntimeError("Unable to fit preprocessing pipelines; no dataset types produced data.")

    return pipelines


def prepare_features(
    features: pd.DataFrame,
    dataset_types: np.ndarray,
    pipelines: Dict[str, Pipeline],
    type_to_id: Dict[str, int],
) -> np.ndarray:
    if len(features) != len(dataset_types):
        raise ValueError("features and dataset_types must align in length.")

    features = features.reset_index(drop=True)
    dataset_types = np.asarray(dataset_types)

    base_dim = len(FEATURE_COLUMNS)
    transformed = np.empty((len(features), base_dim + 1), dtype=np.float32)

    for dtype in np.unique(dataset_types):
        if dtype not in pipelines:
            raise KeyError(f"Missing preprocessing pipeline for dataset type '{dtype}'.")
        mask = dataset_types == dtype
        subset = features.loc[mask, FEATURE_COLUMNS]
        processed = pipelines[dtype].transform(subset)
        indicator = np.full((processed.shape[0], 1), type_to_id[dtype], dtype=np.float32)
        transformed[mask] = np.hstack([processed.astype(np.float32), indicator])

    return transformed


def summarize_folds(fold_metrics: List[Dict[str, float]]) -> Tuple[Dict[str, float], Dict[str, float]]:
    means = {key: float(np.mean([m[key] for m in fold_metrics])) for key in fold_metrics[0]}
    stds = {key: float(np.std([m[key] for m in fold_metrics], ddof=0)) for key in fold_metrics[0]}
    return means, stds


def cross_validate_shared_model(
    features: pd.DataFrame,
    labels: np.ndarray,
    dataset_types: np.ndarray,
    type_to_id: Dict[str, int],
    n_splits: int,
) -> Tuple[List[Dict[str, float]], Dict[str, List[Dict[str, float]]]]:
    splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_SEED)
    fold_metrics: List[Dict[str, float]] = []
    per_type_metrics: Dict[str, List[Dict[str, float]]] = {dtype: [] for dtype in type_to_id}

    for fold_idx, (train_idx, val_idx) in enumerate(splitter.split(features, labels), start=1):
        train_features = features.iloc[train_idx].reset_index(drop=True)
        val_features = features.iloc[val_idx].reset_index(drop=True)
        y_train = labels[train_idx]
        y_val = labels[val_idx]
        train_types = dataset_types[train_idx]
        val_types = dataset_types[val_idx]

        pipelines = fit_group_pipelines(train_features, train_types)
        X_train = prepare_features(train_features, train_types, pipelines, type_to_id)
        X_val = prepare_features(val_features, val_types, pipelines, type_to_id)

        w_train = np.ones_like(y_train, dtype=np.float32)
        model = train_lightgbm(X_train, y_train, w_train)
        if model is None:
            return [], {}

        val_prob = model.predict_proba(X_val)[:, 1]
        metrics = compute_metrics(y_val, val_prob)
        fold_metrics.append(metrics)
        print_metrics(f"Fold {fold_idx}", metrics)

        for dtype in per_type_metrics:
            mask = val_types == dtype
            if not np.any(mask):
                continue
            type_metrics = compute_metrics(y_val[mask], val_prob[mask])
            per_type_metrics[dtype].append(type_metrics)

    return fold_metrics, per_type_metrics


def save_preprocessors(
    model_dir: Path,
    pipelines: Dict[str, Pipeline],
    type_to_id: Dict[str, int],
) -> Path:
    model_dir.mkdir(parents=True, exist_ok=True)
    preprocessor_path = model_dir / PREPROCESSOR_FILENAME
    bundle = {
        "pipelines": pipelines,
        "type_to_id": type_to_id,
        "id_to_type": {idx: dtype for dtype, idx in type_to_id.items()},
        "feature_columns": FEATURE_COLUMNS,
    }
    dump(bundle, preprocessor_path)
    print(f"Saved preprocessing bundle to '{preprocessor_path}'.")
    return preprocessor_path


def save_shared_model(model_dir: Path, model) -> Path:
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / MODEL_FILENAME
    dump(model, model_path)
    print(f"Saved shared LightGBM model to '{model_path}'.")
    return model_path


def print_dataset_overview(data: pd.DataFrame) -> None:
    total_rows = len(data)
    positives = int((data["label"] == 1).sum())
    negatives = int((data["label"] == 0).sum())
    candidates = int(data["is_candidate"].sum())
    print(
        "Dataset summary: "
        f"total={total_rows} positives={positives} negatives={negatives} candidates={candidates}"
    )
    by_type = (
        data.groupby("dataset_type")["label"].agg(["count", "sum"]).rename(columns={"sum": "positives"})
    )
    for dtype, row in by_type.iterrows():
        print(
            f"  {dtype:<7} total={int(row['count']):4d} positives={int(row['positives']):4d}"
        )


def train_models(config: TrainConfig) -> Dict[str, Dict[str, Dict[str, Dict[str, float]]]]:
    data = load_training_frame(config.datasets_dir, config.include_candidates)
    print_dataset_overview(data)

    features = data[FEATURE_COLUMNS].copy()
    labels = data["label"].to_numpy(dtype=np.int64)
    dataset_types = data["dataset_type"].to_numpy(dtype=object)

    unique_types = sorted(set(dataset_types))
    type_to_id = {dtype: idx for idx, dtype in enumerate(unique_types)}

    fold_metrics, per_type_metrics = cross_validate_shared_model(
        features,
        labels,
        dataset_types,
        type_to_id,
        n_splits=config.n_splits,
    )

    if not fold_metrics:
        raise RuntimeError("Cross-validation aborted; LightGBM may be unavailable.")

    overall_mean, overall_std = summarize_folds(fold_metrics)
    per_type_summary: Dict[str, Dict[str, Dict[str, float]]] = {}
    for dtype, metrics_list in per_type_metrics.items():
        if not metrics_list:
            continue
        mean_vals, std_vals = summarize_folds(metrics_list)
        per_type_summary[dtype] = {"mean": mean_vals, "std": std_vals}

    print(
        "Average metrics over "
        f"{config.n_splits} folds: "
        f"accuracy={overall_mean['accuracy']:.3f}+/-{overall_std['accuracy']:.3f} "
        f"roc_auc={overall_mean['roc_auc']:.3f}+/-{overall_std['roc_auc']:.3f} "
        f"avg_precision={overall_mean['avg_precision']:.3f}+/-{overall_std['avg_precision']:.3f} "
        f"brier={overall_mean['brier']:.3f}+/-{overall_std['brier']:.3f}"
    )

    if per_type_summary:
        print("Per dataset-type metrics:")
        for dtype, stats in per_type_summary.items():
            mean_vals = stats["mean"]
            std_vals = stats["std"]
            print(
                f"  {dtype:<7} accuracy={mean_vals['accuracy']:.3f}+/-{std_vals['accuracy']:.3f} "
                f"roc_auc={mean_vals['roc_auc']:.3f}+/-{std_vals['roc_auc']:.3f} "
                f"avg_precision={mean_vals['avg_precision']:.3f}+/-{std_vals['avg_precision']:.3f} "
                f"brier={mean_vals['brier']:.3f}+/-{std_vals['brier']:.3f}"
            )

    pipelines = fit_group_pipelines(features, dataset_types)
    X_all = prepare_features(features, dataset_types, pipelines, type_to_id)
    weights = np.ones_like(labels, dtype=np.float32)
    final_model = train_lightgbm(X_all, labels, weights)
    if final_model is None:
        raise RuntimeError("LightGBM is required to train the shared model but is not installed.")

    save_shared_model(config.model_dir, final_model)
    save_preprocessors(config.model_dir, pipelines, type_to_id)

    evaluation = {
        "shared_model": {
            "LightGBM": {"mean": overall_mean, "std": overall_std},
            "by_dataset_type": per_type_summary,
        }
    }

    return evaluation


def train_cli() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Train LightGBM models for exoplanet classification.")
    parser.add_argument(
        "--datasets-dir",
        default="assets/data",
        help="Directory containing mission CSV datasets (default: assets/data).",
    )
    parser.add_argument(
        "--model-dir",
        default="assets/models",
        help="Directory to persist trained models (default: assets/models).",
    )
    parser.add_argument(
        "--include-candidates",
        action="store_true",
        help="Include candidate labels during training (default: only confirmed/false positives).",
    )
    parser.add_argument(
        "--n-splits",
        type=int,
        default=5,
        help="Number of stratified CV folds (default: 5).",
    )

    args = parser.parse_args()
    config = TrainConfig.from_args(
        datasets_dir=args.datasets_dir,
        model_dir=args.model_dir,
        include_candidates=args.include_candidates,
        n_splits=args.n_splits,
    )

    train_models(config)


# Keep CLI compatibility when executed as a script.
if __name__ == "__main__":
    train_cli()
