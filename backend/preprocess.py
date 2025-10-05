
import pandas as pd

def get_dataframe_format(df: pd.DataFrame) -> str:
    dataset_columns = df.columns.tolist()

    kepler = {
        "name": "Kepler",
        "id": "kepler",
        "columns": ["koi_prad", "koi_steff", "koi_srad", "koi_slogg"]
    }

    k2_tess = {
        "name": "K2 or Tess",
        "id": "k2",
        "columns": ['pl_orbper', 'pl_rade', 'st_teff', 'st_rad', 'st_logg']
    }
    expected_formats = [kepler, k2_tess]

    closest = None
    closest_count = 0
    for current_format in expected_formats:
        expected_columns = current_format["columns"]
        matched_columns = [col for col in expected_columns if col in dataset_columns]
        if len(matched_columns) == len(expected_columns):
            return current_format["name"]
        if len(matched_columns) > closest_count:
            closest_count = matched_columns
            closest = current_format

    if closest_count == 0:
        raise Exception("Cannot recognize data format in the CSV file. Kepler, K2 or Tess dataset formats are expected.")
    expected_columns = closest["columns"]
    unmatched_columns = [col for col in expected_columns if col not in dataset_columns]
    closest_name = closest["name"]
    missing_cols = ", ".join(unmatched_columns)
    raise Exception(f"Provided input does not match {closest_name} format. Missing columns: {missing_cols}")

