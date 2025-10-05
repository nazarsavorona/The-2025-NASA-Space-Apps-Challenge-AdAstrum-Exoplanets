from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

from joblib import load

from .common import FEATURE_COLUMNS, MODEL_FILENAME, PREPROCESSOR_FILENAME

_DEFAULT_OUTPUT_NAME = "feature_importances.json"


class ArtifactNotFoundError(FileNotFoundError):
    """Raised when a required model artifact is missing."""


# Human readable labels derived from the training feature definitions.
_SEMANTIC_NAME_MAP = {
    "orbital_period": "Orbital Period (days)",
    "transit_duration": "Transit Duration (hours)",
    "transit_depth": "Transit Depth (ppm)",
    "impact_parameter": "Impact Parameter",
    "eccentricity": "Eccentricity",
    "inclination": "Inclination (degrees)",
    "planet_radius": "Planet Radius (Earth radii)",
    "planet_equilibrium_temp": "Planet Equilibrium Temperature (K)",
    "insolation_flux": "Insolation Flux (Earth flux)",
    "stellar_temp": "Stellar Effective Temperature (K)",
    "stellar_logg": "Stellar Surface Gravity (log10(cm/s^2))",
    "stellar_radius": "Stellar Radius (solar radii)",
    "stellar_mass": "Stellar Mass (solar masses)",
    "stellar_metallicity": "Stellar Metallicity ([Fe/H])",
    "dataset_type_id": "Dataset Type Indicator",
}


def _load_shared_model(model_dir: Path):
    model_path = model_dir / MODEL_FILENAME
    if not model_path.exists():
        raise ArtifactNotFoundError(
            f"Shared model artifact not found at '{model_path}'. Train the model before computing importances."
        )
    return load(model_path)


def _load_feature_metadata(model_dir: Path) -> List[str]:
    bundle_path = model_dir / PREPROCESSOR_FILENAME
    if not bundle_path.exists():
        raise ArtifactNotFoundError(
            f"Preprocessing bundle not found at '{bundle_path}'. Train the model before computing importances."
        )
    bundle = load(bundle_path)
    feature_columns = bundle.get("feature_columns") or FEATURE_COLUMNS
    return [*feature_columns, "dataset_type_id"]


def _compute_importances(model, feature_names: List[str], importance_type: str) -> Dict[str, float]:
    booster = getattr(model, "booster_", None)
    if booster is None:
        raise RuntimeError("Loaded model does not expose a LightGBM booster; cannot compute feature importances.")

    importances = booster.feature_importance(importance_type=importance_type)
    booster_names = booster.feature_name() or []

    if len(importances) == len(feature_names):
        canonical_names = list(feature_names)
    elif booster_names and len(booster_names) == len(importances):
        canonical_names = list(booster_names)
    else:
        raise RuntimeError(
            "Mismatch between feature importances and expected feature names; "
            "retrain the model to refresh metadata."
        )

    semantic_names = [_SEMANTIC_NAME_MAP.get(name, name) for name in canonical_names]
    return {name: float(importance) for name, importance in zip(semantic_names, importances)}


def compute_feature_importances(
    model_dir: Path,
    output_path: Path | None = None,
    importance_type: str = "gain",
) -> Path:
    """Compute and persist LightGBM feature importances as JSON."""
    model_dir = model_dir.expanduser().resolve()
    model = _load_shared_model(model_dir)
    feature_names = _load_feature_metadata(model_dir)

    importance_type = importance_type.lower()
    valid_types = {"gain", "split"}
    if importance_type not in valid_types:
        raise ValueError(
            f"importance_type must be one of {sorted(valid_types)}, got '{importance_type}'."
        )

    importances = _compute_importances(model, feature_names, importance_type)

    output_path = (output_path or model_dir / _DEFAULT_OUTPUT_NAME).resolve()
    output_path.write_text(json.dumps(importances, indent=2, sort_keys=True))
    return output_path


def feature_importance_cli() -> None:
    parser = argparse.ArgumentParser(
        description="Compute LightGBM feature importances for the shared model and save them as JSON."
    )
    parser.add_argument(
        "--model-dir",
        default="assets/models",
        help="Directory containing the trained shared model artifacts (default: assets/models).",
    )
    parser.add_argument(
        "--output",
        help="Optional output path for the JSON file (default: <model-dir>/feature_importances.json).",
    )
    parser.add_argument(
        "--importance-type",
        default="gain",
        choices=["gain", "split"],
        help="Importance type to request from LightGBM (default: gain).",
    )

    args = parser.parse_args()

    model_dir = Path(args.model_dir)
    output_path = Path(args.output) if args.output else None

    result_path = compute_feature_importances(model_dir, output_path, args.importance_type)
    print(f"Feature importances saved to '{result_path}'.")


if __name__ == "__main__":
    feature_importance_cli()
