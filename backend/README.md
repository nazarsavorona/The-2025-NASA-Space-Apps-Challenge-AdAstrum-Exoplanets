# AdAstrum Backend API

FastAPI backend service for exoplanet classification using machine learning models.

## Setup

### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Train Models (if not already trained)

Make sure you have trained models in the `./assets/models` directory. Run from the project root:

```bash
python -m astrum_ai.training
```

This will create the following artifacts:
- `models/shared_model.joblib`
- `models/shared_preprocessors.joblib`

### Compute Feature Importances

Generate a JSON report of the model's feature importances from the project root:

```bash
python feature_importance.py --model-dir assets/models
```

The script writes `feature_importances.json` alongside the model artifacts by default. Use `--output` to choose a different location or `--importance-type split` to switch from gain-based importances.

### Run the Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### 1. Root Endpoint

**GET** `/`

Returns a welcome message.

**Response:**
```json
{
  "message": "Hello, AdAstrum!"
}
```

---

### 2. AI Prediction Endpoint (JSON)

**POST** `/api/predict/`

Make predictions on exoplanet data provided as JSON.

**Request Body:**
```json
{
  "format": "kepler",
  "data": [
    {
      "koi_period": 3.52,
      "koi_duration": 2.8,
      "koi_depth": 1200,
      "koi_prad": 1.5,
      "koi_steff": 5700,
      "koi_slogg": 4.5,
      "koi_srad": 1.0,
      "koi_smass": 1.0
    }
  ],
  "hyperparams": {
    "candidate_threshold": 0.4,
    "confirmed_threshold": 0.7
  }
}
```

**Parameters:**
- `format` (string, required): Dataset format - `"kepler"`, `"k2"`, `"toi"`, or `"tess"`
- `data` (array, required): Array of objects with mission-specific column names
- `hyperparams` (object, optional): Prediction thresholds
  - `candidate_threshold` (float, default: 0.4): Threshold for candidate class (0-1)
  - `confirmed_threshold` (float, default: 0.7): Threshold for confirmed class (0-1)

**Response:**
```json
{
  "status": "success",
  "predictions": [
    {
      "koi_period": 3.52,
      "koi_prad": 1.5,
      "koi_steff": 5700,
      "predicted_class": 2,
      "predicted_confidence": 0.85
    }
  ],
  "summary": {
    "total": 1,
    "confirmed": 1,
    "candidate": 0,
    "false_positive": 0
  }
}
```

**Predicted Classes:**
- `0` - False Positive
- `1` - Candidate
- `2` - Confirmed

---

### 3. AI Prediction Endpoint (CSV)

**POST** `/api/predict/csv/`

Make predictions on exoplanet data uploaded as a CSV file.

**Parameters (Form Data):**
- `file` (file, required): CSV file with exoplanet data
- `format` (string, default: "kepler"): Dataset format - `"kepler"`, `"k2"`, `"toi"`, or `"tess"`
- `candidate_threshold` (float, default: 0.4): Threshold for candidate class
- `confirmed_threshold` (float, default: 0.7): Threshold for confirmed class

**Example using curl:**
```bash
curl -X POST "http://localhost:8000/api/predict/csv/" \
  -F "file=@kepler_data.csv" \
  -F "format=kepler" \
  -F "candidate_threshold=0.4" \
  -F "confirmed_threshold=0.7"
```

**Response:**
```json
{
  "status": "success",
  "predictions": [...],
  "summary": {
    "total": 100,
    "confirmed": 45,
    "candidate": 30,
    "false_positive": 25
  }
}
```

---

## Data Formats

### Kepler Format

Required columns (at minimum):
- `koi_period` - Orbital period (days)
- `koi_duration` - Transit duration (hours)
- `koi_depth` - Transit depth (ppm)
- `koi_prad` - Planet radius (Earth radii)
- `koi_steff` - Stellar effective temperature (K)
- `koi_slogg` - Stellar surface gravity (log10(cm/s²))
- `koi_srad` - Stellar radius (solar radii)
- `koi_smass` - Stellar mass (solar masses)
- And other `koi_*` columns

### K2 / TOI / TESS Format

Required columns (at minimum):
- `pl_orbper` - Orbital period (days)
- `pl_trandur` - Transit duration (hours)
- `pl_trandep` - Transit depth (ppm)
- `pl_rade` - Planet radius (Earth radii)
- `st_teff` - Stellar effective temperature (K)
- `st_logg` - Stellar surface gravity (log10(cm/s²))
- `st_rad` - Stellar radius (solar radii)
- `st_mass` - Stellar mass (solar masses)
- And other `pl_*` and `st_*` columns

## Example Usage

### Python Example

```python
import requests
import pandas as pd

# Prepare data
data = [
    {
        "koi_period": 3.52,
        "koi_prad": 1.5,
        "koi_steff": 5700,
        "koi_slogg": 4.5,
        # ... other columns
    }
]

# Make prediction request
response = requests.post(
    "http://localhost:8000/api/predict/",
    json={
    "format": "kepler",
        "data": data,
        "hyperparams": {
            "candidate_threshold": 0.4,
            "confirmed_threshold": 0.7
        }
    }
)

result = response.json()
print(f"Total predictions: {result['summary']['total']}")
print(f"Confirmed: {result['summary']['confirmed']}")
print(f"Candidates: {result['summary']['candidate']}")
```

### JavaScript Example

```javascript
const formData = new FormData();
formData.append('file', csvFile);
formData.append('format', 'kepler');
formData.append('candidate_threshold', 0.4);
formData.append('confirmed_threshold', 0.7);

const response = await fetch('http://localhost:8000/api/predict/csv/', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Predictions:', result);
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK` - Successful prediction
- `400 Bad Request` - Invalid input data or parameters
- `500 Internal Server Error` - Server or model error
- `503 Service Unavailable` - Model files not found

Example error response:
```json
{
  "detail": "confirmed_threshold must be greater than candidate_threshold"
}
```

## Session-based Endpoints (Legacy)

The API also includes session-based endpoints for file upload workflows:

- `POST /upload/` - Upload CSV file to session
- `POST /hyperparams/` - Set hyperparameters for session
- `POST /predict/` - Get predictions for uploaded file in session

These endpoints use cookie-based sessions for managing user data.

## Interactive Documentation

FastAPI provides interactive API documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Running Tests

```bash
pytest
```

### Code Structure

- `main.py` - FastAPI application and endpoints
- `model_service.py` - Model loading and prediction logic
- `model_api.py` - API wrapper for model service
- `preprocess.py` - Data format detection
- `utils.py` - Utility functions

## License

See LICENSE file in the project root.
