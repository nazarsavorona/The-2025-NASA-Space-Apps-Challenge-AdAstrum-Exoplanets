"""Command-line helper for running the planet category classifier.

This script demos the :class:`PlanetCategoryClassifier` by:

* scoring an illustrative synthetic planet profile; and
* looping through any available mission CSVs in ``assets/data`` to classify the
  first few rows and print a compact summary.

Usage
-----
    python tests/planet_matching_cli.py [--rows 5] [--dataset kepler]

Optional arguments:
    --rows/-n      Limit the number of rows per dataset (default: 5)
    --dataset/-d   Restrict to one dataset by mission name or CSV path.

The script requires :mod:`pandas`. If it is missing, install the project
requirements first (``pip install -r requirements.txt``).
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

try:
    import pandas as pd
except ImportError as exc:  # pragma: no cover - handled at runtime
    raise SystemExit(
        "pandas is required to run the planet matching CLI. Install it via "
        "'pip install pandas' or the project's requirements file."
    ) from exc

from astrum_ai.common import FEATURE_COLUMNS, MISSION_SPECS
from astrum_ai.inference import load_inference_frame
from astrum_ai.planet_matching import PlanetCategoryClassifier


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the rule-based planet category classifier on mission data."
    )
    parser.add_argument(
        "--rows",
        "-n",
        type=int,
        default=5,
        help="Maximum rows to classify per dataset (default: 5).",
    )
    parser.add_argument(
        "--dataset",
        "-d",
        help="Optional dataset key (e.g., kepler) or path to a CSV file.",
    )
    parser.add_argument(
        "--max-score",
        type=float,
        default=6.0,
        help="Maximum total score allowed when accepting a category (default: 6.0).",
    )
    return parser.parse_args()


def demo_synthetic(classifier: PlanetCategoryClassifier, max_total_score: float) -> None:
    sample = {
        "orbital_period": 12.4,
        "transit_duration": 3.1,
        "transit_depth": 0.004,
        "impact_parameter": 0.2,
        "eccentricity": 0.04,
        "inclination": 88.7,
        "planet_radius": 7.5,
        "planet_equilibrium_temp": 900.0,
        "insolation_flux": 1.8,
        "stellar_temp": 5600.0,
        "stellar_logg": 4.4,
        "stellar_radius": 0.95,
        "stellar_mass": 0.95,
        "stellar_metallicity": 0.1,
    }
    frame = pd.DataFrame([sample])
    result = classifier.predict(frame, max_total_score=max_total_score)
    category = result.loc[0, "predicted_category"]
    score = result.loc[0, "category_score"]
    print("Synthetic sample -> category: %s (score=%.3f)" % (category, score))


def iter_datasets(dataset_arg: str | None) -> Iterable[tuple[str, Path]]:
    if dataset_arg:
        candidate = Path(dataset_arg)
        if candidate.exists():
            yield (candidate.name, candidate)
            return
        for spec in MISSION_SPECS:
            if spec.name == dataset_arg:
                yield (spec.name, Path("assets/data") / spec.filename)
                return
        raise SystemExit(f"Dataset '{dataset_arg}' not recognised or file not found.")

    for spec in MISSION_SPECS:
        csv_path = Path("assets/data") / spec.filename
        if csv_path.exists():
            yield (spec.name, csv_path)



def classify_dataset(
    classifier: PlanetCategoryClassifier,
    dataset_name: str,
    csv_path: Path,
    max_rows: int,
    max_total_score: float,
) -> None:
    spec = next((s for s in MISSION_SPECS if s.name == dataset_name), None)
    if spec is None:
        print(f"Skipping '{dataset_name}': mission spec not found.")
        return

    frame = load_inference_frame(csv_path, spec)
    if frame.empty:
        print(f"Skipping '{dataset_name}': dataset is empty after preprocessing.")
        return

    features = frame[FEATURE_COLUMNS]
    if max_rows > 0:
        features = features.head(max_rows)

    result = classifier.predict(features, max_total_score=max_total_score)
    summary = result["predicted_category"].value_counts(dropna=True)

    print(f"\nDataset '{dataset_name}' ({len(result)} rows)")
    for category, count in summary.items():
        print(f"  {category or 'Unclassified'}: {count}")


def main() -> None:
    args = parse_args()
    classifier = PlanetCategoryClassifier()

    demo_synthetic(classifier, max_total_score=args.max_score)

    any_dataset = False
    for dataset_name, path in iter_datasets(args.dataset):
        any_dataset = True
        classify_dataset(
            classifier,
            dataset_name,
            path,
            max_rows=args.rows,
            max_total_score=args.max_score,
        )

    if not any_dataset:
        print("No mission datasets found under assets/data.")

if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()
