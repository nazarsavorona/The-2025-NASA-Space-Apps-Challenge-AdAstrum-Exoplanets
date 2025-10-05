from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

import numpy as np

FEATURE_COLUMNS = [
    "orbital_period",
    "transit_duration",
    "transit_depth",
    "impact_parameter",
    "eccentricity",
    "inclination",
    "planet_radius",
    "planet_equilibrium_temp",
    "insolation_flux",
    "stellar_temp",
    "stellar_logg",
    "stellar_radius",
    "stellar_mass",
    "stellar_metallicity",
]


@dataclass(frozen=True)
class MissionSpec:
    """Configuration required to load a mission dataset from disk."""

    name: str
    filename: str
    label_field: str
    positive_labels: Sequence[str]
    negative_labels: Sequence[str]
    candidate_labels: Sequence[str]
    feature_map: Dict[str, str]
    dataset_type: str
    requires_default_flag: bool = False

    def resolve_path(self, datasets_dir: Path) -> Path:
        """Return the full path to the dataset within ``datasets_dir``."""

        return Path(datasets_dir) / self.filename


MISSION_SPECS: Sequence[MissionSpec] = [
    MissionSpec(
        name="kepler",
        filename="kepler.csv",
        label_field="koi_disposition",
        positive_labels=("CONFIRMED",),
        negative_labels=("FALSE POSITIVE",),
        candidate_labels=("CANDIDATE",),
        feature_map={
            "orbital_period": "koi_period",
            "transit_duration": "koi_duration",
            "transit_depth": "koi_depth",
            "impact_parameter": "koi_impact",
            "eccentricity": "koi_eccen",
            "inclination": "koi_incl",
            "planet_radius": "koi_prad",
            "planet_equilibrium_temp": "koi_teq",
            "insolation_flux": "koi_insol",
            "stellar_temp": "koi_steff",
            "stellar_logg": "koi_slogg",
            "stellar_radius": "koi_srad",
            "stellar_mass": "koi_smass",
            "stellar_metallicity": "koi_smet",
        },
        dataset_type="kepler",
    ),
    MissionSpec(
        name="k2",
        filename="k2.csv",
        label_field="disposition",
        positive_labels=("CONFIRMED",),
        negative_labels=("FALSE POSITIVE", "REFUTED"),
        candidate_labels=("CANDIDATE",),
        feature_map={
            "orbital_period": "pl_orbper",
            "transit_duration": "pl_trandur",
            "transit_depth": "pl_trandep",
            "impact_parameter": "pl_imppar",
            "eccentricity": "pl_orbeccen",
            "inclination": "pl_orbincl",
            "planet_radius": "pl_rade",
            "planet_equilibrium_temp": "pl_eqt",
            "insolation_flux": "pl_insol",
            "stellar_temp": "st_teff",
            "stellar_logg": "st_logg",
            "stellar_radius": "st_rad",
            "stellar_mass": "st_mass",
            "stellar_metallicity": "st_met",
        },
        dataset_type="toi_k2",
        requires_default_flag=True,
    ),
    MissionSpec(
        name="toi",
        filename="toi.csv",
        label_field="tfopwg_disp",
        positive_labels=("CP", "KP"),
        negative_labels=("FP", "FA"),
        candidate_labels=("PC", "APC"),
        feature_map={
            "orbital_period": "pl_orbper",
            "transit_duration": "pl_trandur",
            "transit_depth": "pl_trandep",
            "impact_parameter": "pl_imppar",
            "eccentricity": "pl_orbeccen",
            "inclination": "pl_orbincl",
            "planet_radius": "pl_rade",
            "planet_equilibrium_temp": "pl_eqt",
            "insolation_flux": "pl_insol",
            "stellar_temp": "st_teff",
            "stellar_logg": "st_logg",
            "stellar_radius": "st_rad",
            "stellar_mass": "st_mass",
            "stellar_metallicity": "st_met",
        },
        dataset_type="toi_k2",
    ),
]


MODEL_FILENAME = "shared_model.joblib"
PREPROCESSOR_FILENAME = "shared_preprocessors.joblib"


def iter_csv_records(path: Path) -> Iterable[Dict[str, str]]:
    """Yield dictionaries for each CSV row, skipping comment lines."""

    with Path(path).open(newline="") as handle:
        header: Optional[List[str]] = None
        for line in handle:
            if line.startswith("#"):
                continue
            header = [col.strip() for col in line.strip().split(",")]
            break
        if not header:
            return
        reader = csv.DictReader(handle, fieldnames=header)
        for row in reader:
            yield {
                key: (value.strip() if isinstance(value, str) else value)
                for key, value in row.items()
            }


def safe_float(value: Optional[str]) -> float:
    if value is None or value == "":
        return np.nan
    try:
        return float(value)
    except ValueError:
        return np.nan
