"""
Cardiovascular Disease Risk Assessment — Model Training Pipeline
================================================================
Trains 4 candidate models on the FULL cleaned dataset (stratified 80/20 split):
  1. Random Forest
  2. SVM (full dataset — no subset)
  3. XGBoost  (real XGBClassifier, NOT HistGradientBoosting)
  4. MLP Neural Network (scikit-learn MLPClassifier)

All models share:
  - identical cleaned dataset
  - identical feature set (12 clinical features)
  - identical ColumnTransformer preprocessing (SimpleImputer → StandardScaler)
  - identical stratified 80/20 split (random_state=42)
  - identical untouched test partition for fair evaluation

Best model selected by ROC-AUC.
Saved to data/models/best_model.joblib + data/models/metadata.json.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cvd_train")

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/cardio_train.csv"
OUT  = ROOT / "data/models"

# ── Feature definitions ──────────────────────────────────────────────────────
FEATURES = [
    "age_years", "gender", "height", "weight",
    "ap_hi", "ap_lo", "cholesterol", "gluc",
    "smoke", "alco", "active", "bmi"
]

# ── XGBoost (real XGBClassifier — fix env dependency rather than substitute) ─
try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
    logger.info("XGBoost successfully imported — using real XGBClassifier.")
except Exception as _xgb_err:
    XGBOOST_AVAILABLE = False
    logger.warning(
        "XGBoost import failed: %s\n"
        "Fix: `brew install libomp` then reinstall xgboost.\n"
        "XGBoost will be skipped in this run — NOT substituted silently.",
        _xgb_err
    )


# ── Data cleaning (identical to what main.py uses at inference) ───────────────
def clean_data(frame: pd.DataFrame) -> pd.DataFrame:
    df = frame.copy().drop_duplicates()
    df = df[(df.height.between(120, 220)) & (df.weight.between(35, 220))]
    df = df[(df.ap_hi.between(80, 250)) & (df.ap_lo.between(40, 150)) & (df.ap_hi > df.ap_lo)]
    df = df[df.age.between(10000, 30000)]
    df["age_years"] = df.age / 365.25
    df["bmi"] = df.weight / (df.height / 100) ** 2
    return df


# ── Metric helper ─────────────────────────────────────────────────────────────
def metric_row(name: str, pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    pred = pipeline.predict(X_test)
    prob = pipeline.predict_proba(X_test)[:, 1]
    return {
        "model":     name,
        "accuracy":  round(float(accuracy_score(y_test, pred)),  4),
        "precision": round(float(precision_score(y_test, pred)), 4),
        "recall":    round(float(recall_score(y_test, pred)),    4),
        "f1":        round(float(f1_score(y_test, pred)),        4),
        "roc_auc":   round(float(roc_auc_score(y_test, prob)),   4),
    }


# ── Build preprocessing transformer (reused across all models) ────────────────
def build_preprocessor() -> ColumnTransformer:
    numeric_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale",  StandardScaler()),
    ])
    return ColumnTransformer(
        [("numeric", numeric_pipe, FEATURES)],
        verbose_feature_names_out=False,
    )


# ── Main training routine ─────────────────────────────────────────────────────
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    logger.info("Loading dataset from %s", DATA)

    raw = pd.read_csv(DATA, sep=None, engine="python")
    df  = clean_data(raw)

    logger.info("Dataset after cleaning: %d rows, %d columns", len(df), len(df.columns))

    X, y = df[FEATURES], df.cardio.astype(int)

    # ── Stratified 80/20 split — same seed for all models ────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    logger.info("Train: %d rows | Test: %d rows | Features: %d", len(X_train), len(X_test), len(FEATURES))

    # ── Define all four candidate models ──────────────────────────────────────
    candidates: dict[str, Pipeline] = {}

    # 1. Random Forest
    candidates["Random Forest"] = Pipeline([
        ("prep",  build_preprocessor()),
        ("model", RandomForestClassifier(
            n_estimators=200,
            max_depth=16,
            min_samples_leaf=6,
            n_jobs=-1,
            random_state=42,
            class_weight="balanced",
        )),
    ])

    # 2. SVM — FULL training set (no subset)
    candidates["SVM"] = Pipeline([
        ("prep",  build_preprocessor()),
        ("model", SVC(
            C=1.0,
            kernel="rbf",
            gamma="scale",
            probability=True,
            random_state=42,
        )),
    ])

    # 3. XGBoost (real XGBClassifier — only when available)
    if XGBOOST_AVAILABLE:
        candidates["XGBoost"] = Pipeline([
            ("prep",  build_preprocessor()),
            ("model", XGBClassifier(
                n_estimators=250,
                max_depth=5,
                learning_rate=0.05,
                subsample=0.80,
                colsample_bytree=0.85,
                min_child_weight=5,
                gamma=0.1,
                eval_metric="logloss",
                n_jobs=-1,
                random_state=42,
            )),
        ])
    else:
        logger.warning("XGBoost skipped — install libomp (brew install libomp) to enable it.")

    # 4. MLP Neural Network
    candidates["MLP Neural Network"] = Pipeline([
        ("prep",  build_preprocessor()),
        ("model", MLPClassifier(
            hidden_layer_sizes=(64, 32, 16),   # Dense 64 → Dense 32 → Dense 16
            activation="relu",
            solver="adam",
            learning_rate_init=0.001,
            max_iter=300,
            early_stopping=True,
            validation_fraction=0.10,
            n_iter_no_change=20,
            batch_size=256,
            alpha=1e-4,                        # L2 regularisation ≈ Dropout equivalent
            random_state=42,
            verbose=False,
        )),
    ])

    # ── Train all models on FULL training partition ────────────────────────────
    rows: list[dict]   = []
    fitted: dict       = {}

    for name, pipeline in candidates.items():
        logger.info("Training %s on %d samples …", name, len(X_train))
        pipeline.fit(X_train, y_train)
        fitted[name] = pipeline
        m = metric_row(name, pipeline, X_test, y_test)
        rows.append(m)
        logger.info(
            "  %-28s | Accuracy %.4f | Precision %.4f | Recall %.4f | F1 %.4f | ROC-AUC %.4f",
            name, m["accuracy"], m["precision"], m["recall"], m["f1"], m["roc_auc"]
        )

    # ── Select best model by ROC-AUC ─────────────────────────────────────────
    best = max(rows, key=lambda r: r["roc_auc"])
    logger.info("Best model: %s (ROC-AUC = %.4f)", best["model"], best["roc_auc"])

    model = fitted[best["model"]]
    joblib.dump(model, OUT / "best_model.joblib")
    logger.info("Saved best model → %s", OUT / "best_model.joblib")

    # ── Write metadata ────────────────────────────────────────────────────────
    meta = {
        "best_model":          best["model"],
        "best_model_metrics":  best,
        "feature_names":       FEATURES,
        "metrics":             rows,
        "training_rows":       len(df),
        "train_size":          len(X_train),
        "test_size":           len(X_test),
        "test_split":          0.20,
        "random_state":        42,
        "source":              "data/raw/cardio_train.csv",
        "xgboost_available":   XGBOOST_AVAILABLE,
        "models_trained":      list(candidates.keys()),
        "trained_at":          datetime.now(timezone.utc).isoformat(),
        "model_version":       "2.0.0",
        "preprocessing": {
            "imputer":    "SimpleImputer(strategy='median')",
            "scaler":     "StandardScaler",
            "feature_names": FEATURES,
        }
    }
    (OUT / "metadata.json").write_text(json.dumps(meta, indent=2))
    logger.info("Saved metadata → %s", OUT / "metadata.json")

    print(json.dumps({
        "best": best,
        "rows_after_cleaning": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "xgboost_available": XGBOOST_AVAILABLE,
        "models_trained": list(candidates.keys()),
        "metrics": rows,
    }, indent=2))


if __name__ == "__main__":
    main()
