"""
Test script for the AI prediction API endpoints.

Run the FastAPI server first:
    uvicorn main:app --reload --port 8000

Then run this script:
    python test_api.py
"""

import requests
import pandas as pd
import json


API_BASE_URL = "http://localhost:8000"


def test_json_prediction():
    """Test the JSON prediction endpoint."""
    print("\n=== Testing JSON Prediction Endpoint ===")
    
    # Sample Kepler data
    data = [
        {
            "koi_period": 3.52,
            "koi_duration": 2.8,
            "koi_depth": 1200.0,
            "koi_prad": 1.5,
            "koi_steff": 5700,
            "koi_slogg": 4.5,
            "koi_srad": 1.0,
            "koi_smass": 1.0,
        },
        {
            "koi_period": 10.5,
            "koi_duration": 3.2,
            "koi_depth": 800.0,
            "koi_prad": 2.1,
            "koi_steff": 6100,
            "koi_slogg": 4.3,
            "koi_srad": 1.2,
            "koi_smass": 1.1,
        }
    ]
    
    payload = {
        "format": "kepler",
        "data": data,
        "hyperparams": {
            "candidate_threshold": 0.4,
            "confirmed_threshold": 0.7
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/predict/",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Success! Status: {result['status']}")
            print(f"  Summary: {result['summary']}")
            print(f"  Number of predictions: {len(result['predictions'])}")
            
            # Print first prediction
            if result['predictions']:
                print(f"\n  First prediction:")
                pred = result['predictions'][0]
                print(f"    Class: {pred['predicted_class']}")
                print(f"    Confidence: {pred['predicted_confidence']:.3f}")
        else:
            print(f"✗ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"✗ Exception: {str(e)}")


def test_csv_prediction():
    """Test the CSV prediction endpoint."""
    print("\n=== Testing CSV Prediction Endpoint ===")
    
    # Create a temporary CSV file
    df = pd.DataFrame([
        {
            "koi_period": 5.2,
            "koi_duration": 3.1,
            "koi_depth": 950.0,
            "koi_prad": 1.8,
            "koi_steff": 5850,
            "koi_slogg": 4.4,
            "koi_srad": 1.05,
            "koi_smass": 1.02,
        }
    ])
    
    csv_file = "test_data.csv"
    df.to_csv(csv_file, index=False)
    
    try:
        with open(csv_file, 'rb') as f:
            files = {'file': ('test_data.csv', f, 'text/csv')}
            data = {
                'format': 'kepler',
                'candidate_threshold': 0.4,
                'confirmed_threshold': 0.7
            }
            
            response = requests.post(
                f"{API_BASE_URL}/api/predict/csv/",
                files=files,
                data=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Success! Status: {result['status']}")
                print(f"  Summary: {result['summary']}")
                print(f"  Number of predictions: {len(result['predictions'])}")
            else:
                print(f"✗ Error {response.status_code}: {response.text}")
                
    except Exception as e:
        print(f"✗ Exception: {str(e)}")
    finally:
        # Clean up
        import os
        if os.path.exists(csv_file):
            os.remove(csv_file)


def test_k2_format():
    """Test with K2 format data."""
    print("\n=== Testing K2 Format ===")
    
    data = [
        {
            "pl_orbper": 4.5,
            "pl_trandur": 2.5,
            "pl_trandep": 1000.0,
            "pl_rade": 1.6,
            "st_teff": 5800,
            "st_logg": 4.45,
            "st_rad": 1.0,
            "st_mass": 1.0,
        }
    ]
    
    payload = {
        "format": "k2",
        "data": data,
        "hyperparams": {
            "candidate_threshold": 0.3,
            "confirmed_threshold": 0.6
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/predict/",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Success! Status: {result['status']}")
            print(f"  Summary: {result['summary']}")
        else:
            print(f"✗ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"✗ Exception: {str(e)}")


def test_error_handling():
    """Test error handling."""
    print("\n=== Testing Error Handling ===")
    
    # Test with invalid format
    print("\n1. Invalid format:")
    payload = {
        "format": "invalid_format",
        "data": [{"test": 1}],
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/predict/",
            json=payload,
            timeout=30
        )
        print(f"  Response {response.status_code}: {response.json()['detail']}")
    except Exception as e:
        print(f"  Exception: {str(e)}")
    
    # Test with invalid thresholds
    print("\n2. Invalid thresholds:")
    payload = {
        "format": "kepler",
        "data": [{"koi_period": 3.5}],
        "hyperparams": {
            "candidate_threshold": 0.7,
            "confirmed_threshold": 0.4  # Invalid: less than candidate
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/predict/",
            json=payload,
            timeout=30
        )
        print(f"  Response {response.status_code}: {response.json()['detail']}")
    except Exception as e:
        print(f"  Exception: {str(e)}")


def main():
    """Run all tests."""
    print("=" * 60)
    print("AdAstrum AI Prediction API Tests")
    print("=" * 60)
    print(f"\nAPI Base URL: {API_BASE_URL}")
    
    # Check if server is running
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print(f"✓ Server is running: {response.json()['message']}")
        else:
            print("✗ Server returned unexpected status")
            return
    except Exception as e:
        print(f"✗ Cannot connect to server: {str(e)}")
        print("\nPlease start the server first:")
        print("  cd backend")
        print("  uvicorn main:app --reload --port 8000")
        return
    
    # Run tests
    test_json_prediction()
    test_csv_prediction()
    test_k2_format()
    test_error_handling()
    
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
