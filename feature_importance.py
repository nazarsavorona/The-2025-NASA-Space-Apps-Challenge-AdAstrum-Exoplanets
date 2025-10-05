"""CLI shim for feature importance extraction.

Delegates to ``astrum_ai.feature_importance`` to compute importances for the
trained LightGBM model and emit them as JSON.
"""

from astrum_ai.feature_importance import feature_importance_cli as main


if __name__ == "__main__":
    main()
