"""
Model service for exoplanet classification predictions.
"""
import os
from pathlib import Path
from typing import Dict

import numpy as np
import pandas as pd
from joblib import load

# Define feature columns expected by the model
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

# Feature mappings for different mission formats
_TOI_K2_FEATURE_MAP = {
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
}

FEATURE_MAPS = {
    "kepler": {
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
    "k2": _TOI_K2_FEATURE_MAP,
    "toi": _TOI_K2_FEATURE_MAP,
    "tess": _TOI_K2_FEATURE_MAP,
}

DATASET_TYPE_MAP = {
    "kepler": "kepler",
    "k2": "toi_k2",
    "toi": "toi_k2",
    "tess": "toi_k2",
}

SHARED_MODEL_FILENAME = "shared_model.joblib"
PREPROCESSOR_BUNDLE_FILENAME = "shared_preprocessors.joblib"

# Resolve default model directory relative to the project root so it works from any CWD
DEFAULT_MODEL_DIR = Path(__file__).resolve().parents[1] / "assets" / "models"


def _resolve_model_dir() -> Path:
    """Determine the directory where trained models are stored."""
    env_dir = os.getenv("MODEL_DIR")
    if env_dir:
        return Path(env_dir).expanduser()
    return DEFAULT_MODEL_DIR


MODEL_DIR = _resolve_model_dir()


class ModelService:
    """Service for loading models and making predictions."""

    def __init__(self, model_dir: Path | str = MODEL_DIR):
        self.model_dir = Path(model_dir).expanduser()
        self.model = None
        self.pipelines: Dict[str, object] = {}
        self.type_to_id: Dict[str, int] = {}
        self.feature_columns = FEATURE_COLUMNS
        self._load_artifacts()

    def _load_artifacts(self):
        """Load the shared model and preprocessing pipelines."""
        model_path = self.model_dir / SHARED_MODEL_FILENAME
        preprocessor_path = self.model_dir / PREPROCESSOR_BUNDLE_FILENAME

        if not model_path.exists():
            raise FileNotFoundError(
                f"Shared model not found at '{model_path}'. "
                "Please train the shared model using 'python -m astrum_ai.training'."
            )
        if not preprocessor_path.exists():
            raise FileNotFoundError(
                f"Preprocessing bundle not found at '{preprocessor_path}'. "
                "Please train the shared model using 'python -m astrum_ai.training'."
            )

        self.model = load(model_path)
        bundle = load(preprocessor_path)
        self.pipelines = bundle.get("pipelines", {})
        self.type_to_id = bundle.get("type_to_id", {})
        self.feature_columns = bundle.get("feature_columns", FEATURE_COLUMNS)

        if not self.pipelines:
            raise ValueError(
                "Preprocessing bundle is missing fitted pipelines. Retrain the shared model."
            )
        if not self.type_to_id:
            raise ValueError(
                "Preprocessing bundle is missing dataset type metadata. Retrain the shared model."
            )
        if self.model is None:
            raise ValueError("Failed to load the shared model artifact. Retrain the shared model.")

    def _safe_float(self, value) -> float:
        """Convert value to float, returning NaN for invalid values."""
        if value is None or value == "" or pd.isna(value):
            return np.nan
        try:
            return float(value)
        except (ValueError, TypeError):
            return np.nan

    def _prepare_features(self, df: pd.DataFrame, format_name: str) -> pd.DataFrame:
        """
        Transform raw dataframe to feature dataframe expected by the model.
        
        Args:
            df: Raw input dataframe with mission-specific column names
            format_name: Mission format ("kepler", "k2", or "tess")
            
        Returns:
            DataFrame with standardized feature columns
        """
        if format_name not in FEATURE_MAPS:
            raise ValueError(
                f"Unknown format '{format_name}'. "
                f"Available options: {list(FEATURE_MAPS.keys())}"
            )

        feature_map = FEATURE_MAPS[format_name]
        rows = []

        for _, raw_row in df.iterrows():
            record = {}
            for feature, source in feature_map.items():
                if source in raw_row:
                    record[feature] = self._safe_float(raw_row[source])
                else:
                    record[feature] = np.nan
            rows.append(record)

        return pd.DataFrame(rows, columns=self.feature_columns)

    def _assign_class(
        self, probability: float, candidate_threshold: float, confirmed_threshold: float
    ) -> int:
        """
        Assign class based on probability and thresholds.
        
        Returns:
            0 - False Positive
            1 - Candidate
            2 - Confirmed
        """
        if probability >= confirmed_threshold:
            return 2
        if probability >= candidate_threshold:
            return 1
        return 0

    def predict(
        self, df: pd.DataFrame, format_name: str, hyperparams: dict
    ) -> pd.DataFrame:
        """
        Make predictions on input dataframe.
        
        Args:
            df: Input dataframe with raw mission data
            format_name: Mission format ("kepler", "k2", or "tess")
            hyperparams: Dictionary with keys:
                - candidate_threshold: float (threshold for candidate class)
                - confirmed_threshold: float (threshold for confirmed class)
                
        Returns:
            DataFrame with original data plus prediction columns:
                - predicted_class: int (0=FP, 1=Candidate, 2=Confirmed)
                - predicted_confidence: float (probability score 0-1)
        """
        # Validate hyperparameters
        candidate_threshold = hyperparams.get("candidate_threshold", 0.4)
        confirmed_threshold = hyperparams.get("confirmed_threshold", 0.7)

        if confirmed_threshold <= candidate_threshold:
            raise ValueError(
                "confirmed_threshold must be greater than candidate_threshold"
            )

        # Prepare features
        features_df = self._prepare_features(df, format_name)
        dataset_type = DATASET_TYPE_MAP.get(format_name)
        if dataset_type is None:
            raise ValueError(
                f"Unknown format '{format_name}'. Available options: {list(FEATURE_MAPS.keys())}"
            )

        if dataset_type not in self.pipelines:
            raise KeyError(
                f"No preprocessing pipeline available for dataset type '{dataset_type}'."
            )
        if dataset_type not in self.type_to_id:
            raise KeyError(
                f"Dataset type '{dataset_type}' missing from shared model metadata."
            )

        pipeline = self.pipelines[dataset_type]
        type_index = self.type_to_id[dataset_type]

        transformed_features = pipeline.transform(features_df)
        type_indicator = np.full((transformed_features.shape[0], 1), type_index, dtype=np.float32)
        features_prepared = np.hstack([transformed_features.astype(np.float32), type_indicator])

        if self.model is None:
            raise RuntimeError("Shared model is not loaded. Retrain the model and restart the service.")

        probabilities = self.model.predict_proba(features_prepared)[:, 1]

        # Assign classes
        classes = [
            self._assign_class(p, candidate_threshold, confirmed_threshold)
            for p in probabilities
        ]

        # Create output dataframe
        result_df = df.copy()
        result_df["predicted_class"] = classes
        result_df["predicted_confidence"] = probabilities
        result_df["id"] = range(1, len(classes) + 1)
        result_df = result_df.replace([np.nan, np.inf, -np.inf], None)

        cols = ["id"] + [col for col in result_df.columns if col != "id"]
        result_df = result_df[cols]
        return result_df


# Global model service instance
_model_service = None


def get_model_service() -> ModelService:
    """Get or create the global model service instance."""
    global _model_service
    if _model_service is None:
        _model_service = ModelService()
    return _model_service
