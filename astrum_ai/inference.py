from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict

import numpy as np
import pandas as pd
from joblib import load

from .common import (
    FEATURE_COLUMNS,
    MODEL_FILENAME,
    MISSION_SPECS,
    PREPROCESSOR_FILENAME,
    MissionSpec,
    iter_csv_records,
    safe_float,
)


def resolve_spec(name: str) -> MissionSpec:
    for spec in MISSION_SPECS:
        if spec.name == name:
            return spec
    raise ValueError(f"Unknown dataset '{name}'. Available options: {[spec.name for spec in MISSION_SPECS]}")


def load_inference_frame(csv_path: Path, spec: MissionSpec) -> pd.DataFrame:
    rows = []
    for raw in iter_csv_records(csv_path):
        record: Dict[str, float] = {
            feature: safe_float(raw.get(source)) for feature, source in spec.feature_map.items()
        }
        record["mission"] = spec.name
        disposition = (raw.get(spec.label_field) or "").strip() if spec.label_field in raw else ""
        record["disposition"] = disposition
        rows.append(record)

    columns = FEATURE_COLUMNS + ["mission", "disposition"]
    if not rows:
        return pd.DataFrame(columns=columns)
    return pd.DataFrame(rows, columns=columns)


def assign_class(probability: float, candidate_threshold: float, confirmed_threshold: float) -> int:
    if probability >= confirmed_threshold:
        return 2
    if probability >= candidate_threshold:
        return 1
    return 0


def scored_filename(csv_path: Path) -> Path:
    suffix = csv_path.suffix or ".csv"
    return csv_path.with_name(f"{csv_path.stem}_scored{suffix}")


def run_inference(
    dataset: str,
    csv_path: Path,
    model_dir: Path,
    candidate_threshold: float,
    confirmed_threshold: float,
    output: Path | None,
) -> Path:
    if confirmed_threshold <= candidate_threshold:
        raise ValueError("confirmed-threshold must be greater than candidate-threshold.")

    spec = resolve_spec(dataset)

    model_path = model_dir / MODEL_FILENAME
    preprocessor_path = model_dir / PREPROCESSOR_FILENAME

    if not model_path.exists():
        raise FileNotFoundError(
            f"Shared model artifact not found at '{model_path}'. Train models before inference."
        )
    if not preprocessor_path.exists():
        raise FileNotFoundError(
            f"Preprocessing bundle not found at '{preprocessor_path}'. Train models before inference."
        )

    model = load(model_path)
    bundle = load(preprocessor_path)

    pipelines = bundle.get("pipelines", {})
    type_to_id = bundle.get("type_to_id", {})
    dataset_type = spec.dataset_type
    if dataset_type not in pipelines:
        raise KeyError(
            f"No preprocessing pipeline available for dataset type '{dataset_type}'."
        )
    if dataset_type not in type_to_id:
        raise KeyError(
            f"Dataset type '{dataset_type}' missing in shared model metadata."
        )

    pipeline = pipelines[dataset_type]
    dataset_type_id = type_to_id[dataset_type]

    raw_frame = pd.read_csv(csv_path, comment="#")
    features_frame = load_inference_frame(csv_path, spec)
    if features_frame.empty:
        raise ValueError("No rows found in the provided CSV after parsing.")

    feature_matrix = pipeline.transform(features_frame[FEATURE_COLUMNS])
    type_indicator = np.full((feature_matrix.shape[0], 1), dataset_type_id, dtype=np.float32)
    features = np.hstack([feature_matrix.astype(np.float32), type_indicator])

    probabilities = model.predict_proba(features)[:, 1]

    classes = [assign_class(p, candidate_threshold, confirmed_threshold) for p in probabilities]

    output_frame = raw_frame.copy()
    output_frame["predicted_class"] = classes
    output_frame["predicted_confidence"] = probabilities

    output_path = output or scored_filename(csv_path)
    output_frame.to_csv(output_path, index=False)
    print(
        f"Wrote scored data with appended columns to '{output_path}'."
        " Columns added: predicted_class, predicted_confidence."
    )
    return output_path


def inference_cli() -> None:
    parser = argparse.ArgumentParser(
        description="Run LightGBM inference and append class predictions plus confidence scores to CSV data."
    )
    parser.add_argument("dataset", help="Dataset key (e.g., kepler, k2, tess).")
    parser.add_argument("csv_path", help="Path to the CSV file to score.")
    parser.add_argument(
        "--model-dir",
        default="assets/models",
        help="Directory containing trained models (default: assets/models).",
    )
    parser.add_argument(
        "--candidate-threshold",
        type=float,
        default=0.4,
        help="Probability threshold for assigning the candidate class (default: 0.4).",
    )
    parser.add_argument(
        "--confirmed-threshold",
        type=float,
        default=0.7,
        help="Probability threshold for assigning the confirmed class (default: 0.7).",
    )
    parser.add_argument(
        "--output",
        help="Optional output path. Defaults to '<input>_scored.csv'.",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    model_dir = Path(args.model_dir)
    output_path = Path(args.output) if args.output else None

    run_inference(
        dataset=args.dataset,
        csv_path=csv_path,
        model_dir=model_dir,
        candidate_threshold=args.candidate_threshold,
        confirmed_threshold=args.confirmed_threshold,
        output=output_path,
    )


if __name__ == "__main__":
    inference_cli()
