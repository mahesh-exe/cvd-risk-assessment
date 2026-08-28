# Cardiovascular Clinical Decision Support MVP

An academic MVP of the SRS dashboard: patient data entry, a real ML model comparison, patient-specific CVD prediction, SHAP risk drivers, health indicators, What-If recalculation, a deliberately labeled simulated telemetry WebSocket, and a truthful WHO GHO unavailable state.

## What was trained

The project includes the public 70,000-row cardiovascular clinical-records dataset in `data/raw/cardio_train.csv`. Training cleans implausible measurements, derives age in years and BMI, then compares Random Forest, XGBoost and SVM using accuracy, precision, recall, F1 and ROC-AUC. The selected model and actual metrics are written to `data/models/`. On macOS without OpenMP, XGBoost is explicitly replaced in the report by a real sklearn gradient-boosting compatibility comparison; no value is fabricated.

## Run it

Use two terminals from the project root.

Use Python 3.12 (Python 3.14 does not currently have compatible wheels for the pinned scientific stack in this MVP):

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend && ../.venv/bin/python -m app.train
../.venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite (normally `http://localhost:5173`). API documentation is available at `http://localhost:8000/docs`.

## Review-demo flow

1. Change a patient’s blood pressure, weight, cholesterol, glucose, smoking, or activity and run an assessment.
2. Point out the risk gauge, indicators, and SHAP TreeExplainer factors split into actionable and baseline groups.
3. Change factors, select **Recalculate simulated risk**, and describe the comparison with the original patient.
4. Show the live telemetry card updating every three seconds and note that it is intentionally simulated.

This is for academic/research demonstration only. It must not be used for clinical diagnosis or treatment decisions.
