# NASA Space Apps Challenge – AdAstrum

A full-stack application for exoplanet classification, combining machine learning models with an interactive Next.js frontend.

## Project Structure

- **Backend (Python/FastAPI)**: AI models and API for exoplanet classification
- **Frontend (Next.js)**: Interactive web interface for data exploration and visualization
- **Models**: LightGBM-based shared classifier covering Kepler and TOI/K2 mission formats

---

## Backend (AI Models & API)

### Prerequisites
- Python 3.11 or newer
- CSV mission datasets placed under the directory you supply via `--datasets-dir` (defaults to `assets/data`)

Create a virtual environment and install the AI requirements:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Training Models
```bash
python train.py \
  --datasets-dir assets/data \
  --model-dir assets/models \
  --n-splits 5
```

Key options:
- `--datasets-dir`: where the mission CSV files (e.g., `kepler.csv`, `k2.csv`, `tess.csv`) live.
- `--model-dir`: output directory for the shared LightGBM model and preprocessing bundle.
- `--include-candidates`: include mission candidate labels during training (disabled by default).
- `--n-splits`: number of stratified CV folds used when evaluating models (default `5`).

Trained artifacts are written to `<model-dir>/shared_model.joblib` and `shared_preprocessors.joblib`.

### Running Inference
Use the `inference.py` wrapper to score new CSV files:
```bash
python inference.py kepler path/to/kepler_sample.csv \
  --model-dir assets/models \
  --candidate-threshold 0.4 \
  --confirmed-threshold 0.7 \
  --output scored.csv
```
The script appends `predicted_class` (0 = false positive, 1 = candidate, 2 = confirmed) and `predicted_confidence` probability columns. When `--output` is omitted, results are saved alongside the source file as `<name>_scored.csv`.

### Backend API 
To run the FastAPI backend locally:
```bash
PYTHONPATH=backend uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or use Docker Compose:
```bash
docker-compose up
```

---

## Frontend (Next.js)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

### Getting Started
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started
>>>>>>> b7e2384 (start)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

### Deploy on Vercel
=======
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Contributing

This project was developed for the 2025 NASA Space Apps Challenge.

## License

See [LICENSE](LICENSE) for details.
