from __future__ import annotations

import asyncio, json, logging, random
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.train import clean_data, DATA

ROOT = Path(__file__).resolve().parents[2]
MODEL_FILE, META_FILE = ROOT / "data/models/best_model.joblib", ROOT / "data/models/metadata.json"
FEATURES = ["age_years", "gender", "height", "weight", "ap_hi", "ap_lo", "cholesterol", "gluc", "smoke", "alco", "active", "bmi"]
DISPLAY = {
    "age_years": "Age", "gender": "Sex", "height": "Height", "weight": "Weight",
    "ap_hi": "Systolic BP", "ap_lo": "Diastolic BP", "cholesterol": "Cholesterol",
    "gluc": "Glucose", "smoke": "Smoking", "alco": "Alcohol", "active": "Physical Activity", "bmi": "BMI"
}
MODIFIABLE = {"height", "weight", "ap_hi", "ap_lo", "cholesterol", "gluc", "smoke", "alco", "active", "bmi"}

IMPROVEMENT_WINDOWS = {"3 months", "6 months", "12 months"}

logger = logging.getLogger("cvd_mvp")
state = {}


def _clean_model_name(raw_name: str) -> str:
    """Return a clean, user-facing model display name."""
    if "XGBoost runtime unavailable" in raw_name:
        return "Gradient Boosting (HistGB)"
    return raw_name


class Patient(BaseModel):
    patient_id: str = "DEMO-001"
    age_years: float = Field(54, ge=18, le=100)
    gender: Literal[1, 2] = 2
    height: float = Field(168, ge=120, le=220)
    weight: float = Field(78, ge=35, le=220)
    ap_hi: float = Field(145, ge=80, le=250)
    ap_lo: float = Field(92, ge=40, le=150)
    cholesterol: Literal[1, 2, 3] = 2
    gluc: Literal[1, 2, 3] = 1
    smoke: Literal[0, 1] = 0
    alco: Literal[0, 1] = 0
    active: Literal[0, 1] = 1


class WhatIf(BaseModel):
    baseline: Patient
    changes: dict[str, float | int]
    improvement_window: str = "3 months"


def as_frame(p: Patient | dict):
    d = p.model_dump() if isinstance(p, Patient) else dict(p)
    d["bmi"] = round(float(d["weight"]) / (float(d["height"]) / 100) ** 2, 1)
    return pd.DataFrame([{f: d[f] for f in FEATURES}]), d


def risk_category(prob: float):
    return "High" if prob >= .65 else "Moderate" if prob >= .35 else "Low"


def explain(frame: pd.DataFrame):
    pipeline, model_name = state["model"], state["meta"]["best_model"]
    transformed = pipeline.named_steps["prep"].transform(frame)
    model = pipeline.named_steps["model"]
    try:
        import shap
        values = shap.TreeExplainer(model).shap_values(transformed)
        values = values[1][0] if isinstance(values, list) else (values[0, :, 1] if getattr(values, "ndim", 0) == 3 else values[0])
        method = "SHAP TreeExplainer"
    except Exception as exc:
        logger.warning("SHAP unavailable (%s); using feature-importance fallback", exc)
        importances = getattr(model, "feature_importances_", np.ones(len(FEATURES)))
        values, method = (transformed[0] * importances).tolist(), "feature-importance fallback"
    items = []
    for feature, value, contribution in zip(FEATURES, frame.iloc[0], values):
        c = float(contribution)
        items.append({
            "feature": feature,
            "label": DISPLAY[feature],
            "value": round(float(value), 1),
            "contribution": round(c, 4),
            "direction": "risk_increasing" if c >= 0 else "protective",
            "group": "modifiable" if feature in MODIFIABLE else "non_modifiable"
        })
    items.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    return {
        "method": method,
        "modifiable": [x for x in items if x["group"] == "modifiable"][:6],
        "non_modifiable": [x for x in items if x["group"] == "non_modifiable"][:3]
    }


def assessment(patient: Patient | dict):
    frame, d = as_frame(patient)
    prob = float(state["model"].predict_proba(frame)[0, 1])
    raw_name = state["meta"]["best_model"]
    display_name = _clean_model_name(raw_name)
    model_note = (
        "Uses scikit-learn HistGradientBoostingClassifier (XGBoost runtime unavailable on this platform)"
        if "XGBoost runtime unavailable" in raw_name else None
    )
    return {
        "patient": d,
        "prediction": {
            "risk_probability": round(prob, 4),
            "risk_score": round(prob * 100, 1),
            "risk_category": risk_category(prob),
            "model_used": display_name,
            "model_used_raw": raw_name,
            "model_note": model_note,
        },
        "explanation": explain(frame),
        "indicators": {
            "bmi": d["bmi"],
            "blood_pressure": f'{int(d["ap_hi"])} / {int(d["ap_lo"])} mmHg',
            "cholesterol": ["Normal", "Above normal", "High"][int(d["cholesterol"]) - 1],
            "glucose": ["Normal", "Above normal", "High"][int(d["gluc"]) - 1],
            "smoking": "Yes" if d["smoke"] else "No",
            "alcohol": "Yes" if d["alco"] else "No",
            "physical_activity": "Active" if d["active"] else "Inactive",
        }
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_FILE.exists():
        raise RuntimeError("Model artifact is missing. Run: python -m app.train")
    state["model"] = joblib.load(MODEL_FILE)
    state["meta"] = json.loads(META_FILE.read_text())

    raw = pd.read_csv(DATA, sep=None, engine="python")
    df = clean_data(raw).head(20)
    patients = []
    for i, row in enumerate(df.to_dict(orient="records")):
        patients.append(Patient(
            patient_id=f"P-100{i+1}", age_years=round(row["age_years"], 1),
            gender=int(row["gender"]), height=float(row["height"]), weight=float(row["weight"]),
            ap_hi=float(row["ap_hi"]), ap_lo=float(row["ap_lo"]),
            cholesterol=int(row["cholesterol"]), gluc=int(row["gluc"]),
            smoke=int(row["smoke"]), alco=int(row["alco"]), active=int(row["active"])
        ).model_dump())
    state["patients"] = patients
    yield


app = FastAPI(title="CVD Clinical Decision Support MVP", version="0.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": _clean_model_name(state["meta"]["best_model"]),
        "model_raw": state["meta"]["best_model"],
        "training_rows": state["meta"]["training_rows"]
    }


@app.get("/api/models")
def models():
    meta = dict(state["meta"])
    meta["best_model_display"] = _clean_model_name(meta["best_model"])
    return meta


@app.get("/api/patients")
def get_patients():
    return state["patients"]


@app.post("/api/assessment")
def get_assessment(patient: Patient):
    return assessment(patient)


@app.post("/api/predict")
def predict(patient: Patient):
    return assessment(patient)["prediction"]


@app.post("/api/explain")
def get_explanation(patient: Patient):
    return assessment(patient)["explanation"]


@app.post("/api/what-if")
def what_if(payload: WhatIf):
    # Validate improvement window
    window = payload.improvement_window
    if window not in IMPROVEMENT_WINDOWS:
        raise HTTPException(422, f"improvement_window must be one of: {', '.join(sorted(IMPROVEMENT_WINDOWS))}")

    before = assessment(payload.baseline)

    valid = MODIFIABLE - {"bmi"}
    illegal = set(payload.changes) - valid
    if illegal:
        raise HTTPException(422, f"Only modifiable fields may change: {', '.join(sorted(illegal))}")

    changed = payload.baseline.model_dump()
    changed.update(payload.changes)
    after = assessment(changed)

    # Build human-readable factor changes list
    factor_changes = []
    label_map = {
        "ap_hi": "Systolic BP", "ap_lo": "Diastolic BP", "weight": "Weight (kg)",
        "cholesterol": "Cholesterol", "gluc": "Glucose", "smoke": "Smoking",
        "alco": "Alcohol", "active": "Physical Activity",
    }
    chol_labels = {1: "Normal", 2: "Above Normal", 3: "High"}
    gluc_labels  = {1: "Normal", 2: "Above Normal", 3: "High"}
    bool_labels  = {0: "No", 1: "Yes"}
    act_labels   = {0: "Inactive", 1: "Active"}

    for k, new_v in payload.changes.items():
        old_v = getattr(payload.baseline, k)
        if old_v == new_v:
            continue
        if k == "cholesterol":
            old_s, new_s = chol_labels.get(int(old_v), str(old_v)), chol_labels.get(int(new_v), str(new_v))
        elif k == "gluc":
            old_s, new_s = gluc_labels.get(int(old_v), str(old_v)), gluc_labels.get(int(new_v), str(new_v))
        elif k == "smoke":
            old_s, new_s = bool_labels.get(int(old_v), str(old_v)), bool_labels.get(int(new_v), str(new_v))
        elif k == "alco":
            old_s, new_s = bool_labels.get(int(old_v), str(old_v)), bool_labels.get(int(new_v), str(new_v))
        elif k == "active":
            old_s, new_s = act_labels.get(int(old_v), str(old_v)), act_labels.get(int(new_v), str(new_v))
        else:
            old_s, new_s = str(old_v), str(new_v)
        factor_changes.append({
            "field": k,
            "label": label_map.get(k, k),
            "from": old_s,
            "to": new_s,
        })

    change_pp = round(after["prediction"]["risk_score"] - before["prediction"]["risk_score"], 1)

    return {
        "current_risk": before["prediction"]["risk_score"],
        "simulated_risk": after["prediction"]["risk_score"],
        "change_pp": change_pp,
        "current_category": before["prediction"]["risk_category"],
        "simulated_category": after["prediction"]["risk_category"],
        "improvement_window": window,
        "factor_changes": factor_changes,
        # Legacy fields kept for backward compat
        "current": before["prediction"],
        "simulated": after["prediction"],
        "difference_points": change_pp,
        "assessment": after,
    }


@app.get("/api/who/benchmark")
def who_benchmark():
    return {
        "status": "unavailable",
        "message": "WHO GHO live benchmark is not configured for this MVP deployment. The dashboard intentionally does not display substitute values."
    }


@app.websocket("/ws/patient/{patient_id}")
async def telemetry(websocket: WebSocket, patient_id: str):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json({
                "patient_id": patient_id,
                "kind": "simulated_telemetry",
                "systolic_bp": random.randint(118, 150),
                "diastolic_bp": random.randint(75, 95),
                "heart_rate": random.randint(62, 92)
            })
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
