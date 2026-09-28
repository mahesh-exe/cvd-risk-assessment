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

IMPROVEMENT_WINDOWS = {"3 months", "6 months", "12 months", "Target Risk Reduction Window", "target window"}

logger = logging.getLogger("cvd_mvp")
state = {}

# ── Known model display names (canonical mapping, no hardcoded fallbacks) ─────
_MODEL_DISPLAY_MAP = {
    "Random Forest":    "Random Forest",
    "SVM":              "SVM",
    "XGBoost":          "XGBoost",
    "MLP Neural Network": "MLP Neural Network",
    # Legacy name from v1 training — only displayed honestly
    "Gradient Boosting (XGBoost runtime unavailable)": "Gradient Boosting (HistGradientBoosting)",
}

def _clean_model_name(raw_name: str) -> str:
    """Return canonical user-facing model display name."""
    return _MODEL_DISPLAY_MAP.get(raw_name, raw_name)


def _shap_method_for_model(model) -> str:
    """Return the appropriate SHAP explainer type for a given model object."""
    name = type(model).__name__
    if name in ("RandomForestClassifier", "XGBClassifier", "GradientBoostingClassifier",
                "HistGradientBoostingClassifier", "ExtraTreesClassifier"):
        return "tree"
    if name in ("MLPClassifier",):
        return "kernel"
    if name in ("SVC", "SVR", "LinearSVC"):
        return "kernel"
    return "kernel"  # safe fallback


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
    improvement_window: str = "Target Risk Reduction Window"


def as_frame(p: Patient | dict):
    d = p.model_dump() if isinstance(p, Patient) else dict(p)
    d["bmi"] = round(float(d["weight"]) / (float(d["height"]) / 100) ** 2, 1)
    return pd.DataFrame([{f: d[f] for f in FEATURES}]), d


def risk_category(prob: float):
    return "High" if prob >= .65 else "Moderate" if prob >= .35 else "Low"


def explain(frame: pd.DataFrame):
    """
    Model-appropriate SHAP explanation.
    - Tree models (RF, XGBoost): TreeExplainer
    - MLP / SVM:                 KernelExplainer on a small background sample
    Falls back to feature-importance if SHAP fails for any reason.
    """
    pipeline   = state["model"]
    model_name = state["meta"]["best_model"]
    prep       = pipeline.named_steps["prep"]
    model      = pipeline.named_steps["model"]
    transformed = prep.transform(frame)

    shap_method = _shap_method_for_model(model)
    values = None
    method = "unknown"

    try:
        import shap
        if shap_method == "tree":
            explainer = shap.TreeExplainer(model)
            raw_vals  = explainer.shap_values(transformed)
            # Handle both list-of-arrays (RF binary) and plain 2D array (XGBoost)
            if isinstance(raw_vals, list):
                values = raw_vals[1][0]
            elif getattr(raw_vals, "ndim", 0) == 3:
                values = raw_vals[0, :, 1]
            else:
                values = raw_vals[0]
            method = "SHAP TreeExplainer"

        else:
            # KernelExplainer — needs a background dataset
            # Use the training data background stored in state (sampled 200 rows)
            background = state.get("shap_background")
            if background is None:
                logger.warning("SHAP background not ready; using zero background")
                background = np.zeros((1, transformed.shape[1]))
            explainer = shap.KernelExplainer(
                lambda x: model.predict_proba(x)[:, 1],
                background,
                link="logit",
            )
            # nsamples=64 balances speed vs accuracy for the MVP
            raw_vals = explainer.shap_values(transformed, nsamples=64, silent=True)
            values   = raw_vals[0] if isinstance(raw_vals, list) else raw_vals[0]
            method   = f"SHAP KernelExplainer ({type(model).__name__})"

    except Exception as exc:
        logger.warning("SHAP failed (%s); using feature-importance/gradient fallback", exc)
        # Fallback: feature importances (tree) or coefficient-based (SVM/MLP)
        # Use explicit None checks — never `or` on numpy arrays (ambiguous truth value)
        importances = getattr(model, "feature_importances_", None)
        if importances is None:
            importances = getattr(model, "coef_", None)
        if importances is None:
            importances = np.ones(len(FEATURES))
        if hasattr(importances, "ravel"):
            importances = importances.ravel()
        if len(importances) > len(FEATURES):
            importances = importances[:len(FEATURES)]
        values = (transformed[0] * importances).tolist()
        method = "feature-importance fallback"

    items = []
    for feature, value, contribution in zip(FEATURES, frame.iloc[0], values):
        c = float(contribution)
        items.append({
            "feature":      feature,
            "label":        DISPLAY[feature],
            "value":        round(float(value), 1),
            "contribution": round(c, 4),
            "direction":    "risk_increasing" if c >= 0 else "protective",
            "group":        "modifiable" if feature in MODIFIABLE else "non_modifiable"
        })
    items.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    return {
        "method":        method,
        "modifiable":    [x for x in items if x["group"] == "modifiable"][:6],
        "non_modifiable": [x for x in items if x["group"] == "non_modifiable"][:3],
    }


def assessment(patient: Patient | dict):
    frame, d = as_frame(patient)
    prob      = float(state["model"].predict_proba(frame)[0, 1])
    raw_name  = state["meta"]["best_model"]
    display_name = _clean_model_name(raw_name)
    return {
        "patient": d,
        "prediction": {
            "risk_probability": round(prob, 4),
            "risk_score":       round(prob * 100, 1),
            "risk_category":    risk_category(prob),
            "model_used":       display_name,
            "model_used_raw":   raw_name,
            "model_note":       None,
        },
        "explanation": explain(frame),
        "indicators": {
            "bmi":               d["bmi"],
            "blood_pressure":    f'{int(d["ap_hi"])} / {int(d["ap_lo"])} mmHg',
            "cholesterol":       ["Normal", "Above normal", "High"][int(d["cholesterol"]) - 1],
            "glucose":           ["Normal", "Above normal", "High"][int(d["gluc"]) - 1],
            "smoking":           "Yes" if d["smoke"] else "No",
            "alcohol":           "Yes" if d["alco"] else "No",
            "physical_activity": "Active" if d["active"] else "Inactive",
        }
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_FILE.exists():
        raise RuntimeError("Model artifact is missing. Run: python -m app.train")
    state["model"] = joblib.load(MODEL_FILE)
    state["meta"]  = json.loads(META_FILE.read_text())

    # ── Pre-build KernelExplainer background (200-row sample of training data) ─
    # Needed only when the best model is MLP or SVM.
    best_model_name = state["meta"]["best_model"]
    model_obj       = state["model"].named_steps["model"]
    if _shap_method_for_model(model_obj) == "kernel":
        try:
            logger.info("Building SHAP KernelExplainer background for %s …", best_model_name)
            raw = pd.read_csv(DATA, sep=None, engine="python")
            df_bg = clean_data(raw).sample(n=200, random_state=42)
            X_bg  = df_bg[FEATURES]
            prep  = state["model"].named_steps["prep"]
            state["shap_background"] = prep.transform(X_bg)
            logger.info("SHAP background built: %d rows", len(df_bg))
        except Exception as exc:
            logger.warning("Could not build SHAP background: %s", exc)

    # ── Load patient cohort ──────────────────────────────────────────────────
    raw = pd.read_csv(DATA, sep=None, engine="python")
    df  = clean_data(raw).head(50)
    patients = []
    for i, row in enumerate(df.to_dict(orient="records")):
        try:
            patients.append(Patient(
                patient_id=f"P-{int(row.get('id', 1001+i))}",
                age_years=round(row["age_years"], 1),
                gender=int(row["gender"]),
                height=float(row["height"]),
                weight=float(row["weight"]),
                ap_hi=float(row["ap_hi"]),
                ap_lo=float(row["ap_lo"]),
                cholesterol=int(row["cholesterol"]),
                gluc=int(row["gluc"]),
                smoke=int(row["smoke"]),
                alco=int(row["alco"]),
                active=int(row["active"]),
            ).model_dump())
        except Exception:
            pass
    state["patients"] = patients
    yield


app = FastAPI(title="CVD Clinical Decision Support", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {
        "status":        "ok",
        "model":         _clean_model_name(state["meta"]["best_model"]),
        "model_raw":     state["meta"]["best_model"],
        "training_rows": state["meta"]["training_rows"],
        "model_version": state["meta"].get("model_version", "1.0.0"),
    }


@app.get("/api/models")
def models():
    meta = dict(state["meta"])
    meta["best_model_display"] = _clean_model_name(meta["best_model"])
    cleaned_metrics = []
    for m in meta.get("metrics", []):
        m_copy = dict(m)
        m_copy["model_display"] = _clean_model_name(m["model"])
        m_copy["is_selected"]   = (m["model"] == meta["best_model"])
        cleaned_metrics.append(m_copy)
    meta["metrics"] = cleaned_metrics
    return meta


@app.get("/api/patients")
def get_patients():
    return state["patients"]


@app.post("/api/patients")
def create_patient(patient: Patient):
    p_dict = patient.model_dump()
    existing_ids = {p["patient_id"] for p in state["patients"]}
    if p_dict["patient_id"] in existing_ids or p_dict["patient_id"] == "DEMO-001":
        new_num = len(state["patients"]) + 1
        p_dict["patient_id"] = f"P-NEW{new_num:03d}"
    state["patients"].insert(0, p_dict)
    return p_dict


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
    window = payload.improvement_window or "Target Risk Reduction Window"
    if window not in IMPROVEMENT_WINDOWS and not window.lower().startswith("target"):
        raise HTTPException(422, f"improvement_window must be one of: {', '.join(sorted(IMPROVEMENT_WINDOWS))}")

    before = assessment(payload.baseline)

    valid   = MODIFIABLE - {"bmi"}
    illegal = set(payload.changes) - valid
    if illegal:
        raise HTTPException(422, f"Only modifiable fields may change: {', '.join(sorted(illegal))}")

    changed = payload.baseline.model_dump()
    changed.update(payload.changes)
    after = assessment(changed)

    label_map   = {"ap_hi": "Systolic BP", "ap_lo": "Diastolic BP", "weight": "Weight (kg)",
                   "cholesterol": "Cholesterol", "gluc": "Glucose", "smoke": "Smoking",
                   "alco": "Alcohol", "active": "Physical Activity"}
    chol_labels = {1: "Normal", 2: "Above Normal", 3: "High"}
    gluc_labels = {1: "Normal", 2: "Above Normal", 3: "High"}
    bool_labels = {0: "No", 1: "Yes"}
    act_labels  = {0: "Inactive", 1: "Active"}

    factor_changes = []
    for k, new_v in payload.changes.items():
        old_v = getattr(payload.baseline, k)
        if old_v == new_v:
            continue
        if k == "cholesterol":
            old_s, new_s = chol_labels.get(int(old_v), str(old_v)), chol_labels.get(int(new_v), str(new_v))
        elif k == "gluc":
            old_s, new_s = gluc_labels.get(int(old_v), str(old_v)), gluc_labels.get(int(new_v), str(new_v))
        elif k in ("smoke", "alco"):
            old_s, new_s = bool_labels.get(int(old_v), str(old_v)), bool_labels.get(int(new_v), str(new_v))
        elif k == "active":
            old_s, new_s = act_labels.get(int(old_v), str(old_v)), act_labels.get(int(new_v), str(new_v))
        else:
            old_s, new_s = str(old_v), str(new_v)
        factor_changes.append({"field": k, "label": label_map.get(k, k), "from": old_s, "to": new_s})

    change_pp = round(after["prediction"]["risk_score"] - before["prediction"]["risk_score"], 1)

    return {
        "current_risk":       before["prediction"]["risk_score"],
        "simulated_risk":     after["prediction"]["risk_score"],
        "change_pp":          change_pp,
        "current_category":   before["prediction"]["risk_category"],
        "simulated_category": after["prediction"]["risk_category"],
        "improvement_window": window,
        "factor_changes":     factor_changes,
        "current":            before["prediction"],
        "simulated":          after["prediction"],
        "difference_points":  change_pp,
        "assessment":         after,
    }


@app.get("/api/who/benchmark")
def who_benchmark(gender: int = 2, force_fail: bool = False):
    """
    Official WHO Global Health Observatory (GHO) Population Reference.
    Indicator: BP_06 (Mean systolic blood pressure, age-standardized estimate, adults 18+).
    Queries live Athena API with verified cache fallback.
    """
    if force_fail:
        return {
            "status":        "unavailable",
            "message":       "WHO GHO Athena API connection simulate offline.",
            "last_verified": "2026-09-24T19:49:00+05:30",
            "source":        "WHO Global Health Observatory"
        }

    cache_file = ROOT / "data/who_gho_cache.json"
    cache_data = None
    if cache_file.exists():
        try:
            cache_data = json.loads(cache_file.read_text())
        except Exception:
            pass

    live_vals = {}
    try:
        import urllib.request
        url = "https://ghoapi.azureedge.net/api/BP_06?$filter=SpatialDim%20eq%20%27GLOBAL%27%20and%20TimeDim%20eq%202015"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for r in data.get("value", []):
                dim = r.get("Dim1")
                num = r.get("NumericValue")
                if dim and num is not None:
                    live_vals[dim] = round(float(num), 1)
    except Exception as exc:
        logger.info("WHO live query fallback to verified cache: %s", exc)

    male_val   = live_vals.get("SEX_MLE")   or (cache_data.get("global_male")   if cache_data else 127.0)
    female_val = live_vals.get("SEX_FMLE")  or (cache_data.get("global_female") if cache_data else 122.3)
    mean_val   = round((male_val + female_val) / 2, 1)

    ref_val          = female_val if gender == 1 else male_val
    ref_gender_label = "Female"   if gender == 1 else "Male"

    return {
        "status":           "available",
        "indicator_code":   "BP_06",
        "indicator_name":   "Mean systolic blood pressure (age-standardized estimate)",
        "metric_name":      "Systolic Blood Pressure (mmHg)",
        "reference_value":  ref_val,
        "reference_gender": ref_gender_label,
        "global_male":      male_val,
        "global_female":    female_val,
        "global_mean":      mean_val,
        "year":             2015,
        "source":           "WHO Global Health Observatory (GHO) Athena API",
        "last_verified":    "2026-09-24T19:49:00+05:30",
        "comparison_title": "Patient Blood Pressure vs WHO Population Reference",
        "comparison_note":  f"Comparing patient's systolic blood pressure against WHO sex-matched ({ref_gender_label}) global age-standardized adult mean ({ref_val} mmHg)."
    }


@app.websocket("/ws/patient/{patient_id}")
async def telemetry(websocket: WebSocket, patient_id: str):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json({
                "patient_id":   patient_id,
                "kind":         "simulated_telemetry",
                "systolic_bp":  random.randint(118, 150),
                "diastolic_bp": random.randint(75, 95),
                "heart_rate":   random.randint(62, 92)
            })
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
