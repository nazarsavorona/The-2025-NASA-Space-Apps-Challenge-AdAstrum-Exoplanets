
import logging
from io import BytesIO
from typing import Dict

import aiofiles
import pandas as pd
from fastapi import APIRouter, FastAPI, UploadFile, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, Field
from starlette.responses import FileResponse, JSONResponse

from model_api import call_model
from preprocess import get_dataframe_format
import uuid

from utils import write_json, save_as_csv, read_csv_to_df


# Pydantic models for request/response validation
class Hyperparams(BaseModel):
    """Hyperparameters for prediction thresholds."""
    candidate_threshold: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Threshold for candidate classification (0-1)"
    )
    confirmed_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Threshold for confirmed classification (0-1)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "candidate_threshold": 0.4,
                "confirmed_threshold": 0.7
            }
        }


class PredictionRequest(BaseModel):
    """Request model for AI prediction endpoint."""
    format: str = Field(
        ...,
        description="Dataset format: 'kepler', 'k2', or 'tess'"
    )
    data: list = Field(
        ...,
        description="List of records (JSON format) or CSV content"
    )
    hyperparams: Hyperparams = Field(
        default_factory=lambda: Hyperparams(),
        description="Prediction hyperparameters"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "format": "kepler",
                "data": [
                    {
                        "koi_period": 3.52,
                        "koi_prad": 1.5,
                        "koi_steff": 5700
                    }
                ],
                "hyperparams": {
                    "candidate_threshold": 0.4,
                    "confirmed_threshold": 0.7
                }
            }
        }


def exoplanets_file(session_name: str):
    return f"dynamic/{session_name}-exoplanets.csv"


def results_file(session_name: str):
    return f"dynamic/{session_name}-results.csv"


def hyperparams_file(session_name: str):
    return f"dynamic/{session_name}-hyperparams.json"


app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@app.middleware("http")
async def add_session_id(request: Request, call_next):
    session_id = request.cookies.get("session_id")
    print(session_id)
    if not session_id:
        session_id = str(uuid.uuid4())

    request.state.session_id = session_id

    response: Response = await call_next(request)

    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite="none"
    )
    return response


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:63343",
    "http://127.0.0.1:63343",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Hello, AdAstrum!"}


@app.post("/upload/")
async def upload(request: Request, file: UploadFile | None):
    session_id = request.state.session_id
    print(session_id)
    print(request)
    filepath = Path(exoplanets_file(session_id))
    if file:
        try:
            async with aiofiles.open(filepath, "wb") as out_file:
                while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                    await out_file.write(chunk)
            logger.info("Session file saved successfully: %s", filepath)
            return {"message": "File uploaded successfully"}, status.HTTP_201_CREATED
        except Exception as exc:
            logger.error("Failed to save session file: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save session file"
            ) from exc

    else:
        try:
            if filepath.exists():
                filepath.unlink()
                logger.info("Session file removed: %s", filepath)
            else:
                logger.info("No session file found to remove")
            return status.HTTP_204_NO_CONTENT
        except Exception as exc:
            logger.error("Failed to remove session file: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove session file"
            ) from exc


def set_hyperparams(session_id: str, hyperparams: Dict):
    hyperparams_f = hyperparams_file(session_id)
    write_json(hyperparams_f, hyperparams)
    return status.HTTP_201_CREATED


def _filter_result_columns(df: pd.DataFrame):
    result_df = pd.DataFrame()
    for col in ["id", "predicted_class", "predicted_confidence"]:
        if col in df.columns:
            result_df[col] = df[col].values

    optional_cols = [
        "kepoi_name", "toi", "pl_name",
        "kepler_name", "tid", "hostname"
    ]
    for col in optional_cols:
        if col in df:
            result_df[col] = df[col]

    return result_df.to_dict(orient="records")



@app.post("/predict/")
async def get_result_for_file(request: Request, hyperparams: Dict):
    session_id = request.state.session_id
    set_hyperparams(session_id, hyperparams)
    planet_file = exoplanets_file(session_id)
    try:
        df = pd.read_csv(planet_file, comment="#")
    except Exception as exs:
        logger.info(exs)
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cannot read planet file"
        )
    try:
        data_format = get_dataframe_format(df)
    except Exception as exs:
        logger.info(exs)
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot detect dataframe format"
        )
    result_df = await call_model(data_format, df, hyperparams)
    save_as_csv(results_file(session_id), result_df)
    data_to_return = _filter_result_columns(result_df)

    return JSONResponse(content= {
        "status": "success",
        "predictions": data_to_return,
        "summary": {
            "total": len(result_df),
            "confirmed": int((result_df["predicted_class"] == 2).sum()),
            "candidate": int((result_df["predicted_class"] == 1).sum()),
            "false_positive": int((result_df["predicted_class"] == 0).sum()),
        }
    })


@app.get("/get-result/{target_id}/")
async def get_result(request: Request, target_id: int):
    session_id = request.state.session_id
    df = read_csv_to_df(results_file(session_id))
    if "id" not in df.columns:
        raise HTTPException(status_code=400, detail="Results file missing 'id' column")
    record = df[df["id"] == target_id]

    if record.empty:
        raise HTTPException(status_code=404, detail="Record not found")
    return record.iloc[0].to_dict()


@app.get("/download/")
async def test_endpoint(request: Request):
    session_id = request.state.session_id
    return FileResponse(
        path=results_file(session_id),
        filename="result.csv",
        media_type="text/csv"
    )


@app.post("/test-endpoint/")
async def test_endpoint(file: UploadFile | None, hyperparams: dict | None = None):
    if hyperparams is None:
        hyperparams = {
            "candidate_threshold": 0.2,
            "confirmed_threshold": 0.5,
        }

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    try:
        contents = await file.read()
        df = pd.read_csv(BytesIO(contents))
        data_format = get_dataframe_format(df)
    except Exception as exs:
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exs
        )
    result_df = await call_model(data_format, df, hyperparams)
    save_as_csv(results_file("test-user"), result_df)
    data_to_return = _filter_result_columns(result_df)
    return JSONResponse(content={
        "status": "success",
        "predictions": data_to_return,
        "summary": {
            "total": len(result_df),
            "confirmed": int((result_df["predicted_class"] == 2).sum()),
            "candidate": int((result_df["predicted_class"] == 1).sum()),
            "false_positive": int((result_df["predicted_class"] == 0).sum()),
        }
    })



@app.post("/api/predict/")
async def predict_endpoint(request: PredictionRequest):
    """
    AI Model Prediction Endpoint

    Accepts JSON or CSV data and returns exoplanet classification predictions.

    Args:
        request: PredictionRequest with format, data, and hyperparams

    Returns:
        JSON response with predictions and summary statistics

    Example:
        POST /api/predict/
        {
            "format": "kepler",
            "data": [...],
            "hyperparams": {
                "candidate_threshold": 0.4,
                "confirmed_threshold": 0.7
            }
        }
    """
    try:
        # Convert request data to DataFrame
        df = pd.DataFrame(request.data)

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided in request"
            )

        # Validate format
        format_name = request.format.lower()
        if format_name not in ["kepler", "k2", "tess"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid format '{request.format}'. Must be one of: kepler, k2, tess"
            )

        # Validate hyperparameters
        hyperparams = request.hyperparams.dict()
        if hyperparams["confirmed_threshold"] <= hyperparams["candidate_threshold"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="confirmed_threshold must be greater than candidate_threshold"
            )

        # Make predictions
        logger.info(
            f"Making predictions for {len(df)} records with format '{format_name}'"
        )
        result = await call_model(format_name, df, hyperparams)

        logger.info(
            f"Predictions completed: {result.get('summary', {})}"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/api/predict/csv/")
async def predict_csv_endpoint(
        file: UploadFile,
        format: str = "kepler",
        candidate_threshold: float = 0.4,
        confirmed_threshold: float = 0.7
):
    """
    AI Model Prediction Endpoint for CSV files

    Accepts a CSV file upload and returns predictions.

    Args:
        file: CSV file upload
        format: Dataset format (kepler, k2, or tess)
        candidate_threshold: Threshold for candidate classification
        confirmed_threshold: Threshold for confirmed classification

    Returns:
        JSON response with predictions and summary statistics
    """
    try:
        # Validate file type
        if not file.filename.endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV files are supported"
            )

        # Validate format
        format_name = format.lower()
        if format_name not in ["kepler", "k2", "tess"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid format '{format}'. Must be one of: kepler, k2, tess"
            )

        # Validate hyperparameters
        if confirmed_threshold <= candidate_threshold:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="confirmed_threshold must be greater than candidate_threshold"
            )

        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(BytesIO(contents))

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file is empty"
            )

        # Prepare hyperparameters
        hyperparams = {
            "candidate_threshold": candidate_threshold,
            "confirmed_threshold": confirmed_threshold
        }

        # Make predictions
        logger.info(
            f"Making predictions for {len(df)} records from CSV with format '{format_name}'"
        )
        result = await call_model(format_name, df, hyperparams)

        logger.info(
            f"CSV predictions completed: {result.get('summary', {})}"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )
