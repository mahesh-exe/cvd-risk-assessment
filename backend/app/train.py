from __future__ import annotations

import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except Exception:
    # The macOS wheel needs libomp; retain a real, clearly labelled sklearn boosting comparison when absent.
    XGBOOST_AVAILABLE = False

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/cardio_train.csv"
OUT = ROOT / "data/models"
FEATURES = ["age_years", "gender", "height", "weight", "ap_hi", "ap_lo", "cholesterol", "gluc", "smoke", "alco", "active", "bmi"]

def clean_data(frame: pd.DataFrame) -> pd.DataFrame:
    df = frame.copy().drop_duplicates()
    df = df[(df.height.between(120, 220)) & (df.weight.between(35, 220))]
    df = df[(df.ap_hi.between(80, 250)) & (df.ap_lo.between(40, 150)) & (df.ap_hi > df.ap_lo)]
    df = df[df.age.between(10000, 30000)]
    df["age_years"] = df.age / 365.25
    df["bmi"] = df.weight / (df.height / 100) ** 2
    return df

def metric_row(name, model, X_test, y_test):
    pred = model.predict(X_test)
    prob = model.predict_proba(X_test)[:, 1]
    return {"model": name, "accuracy": round(float(accuracy_score(y_test, pred)), 4),
            "precision": round(float(precision_score(y_test, pred)), 4),
            "recall": round(float(recall_score(y_test, pred)), 4),
            "f1": round(float(f1_score(y_test, pred)), 4), "roc_auc": round(float(roc_auc_score(y_test, prob)), 4)}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    raw = pd.read_csv(DATA, sep=None, engine="python")
    df = clean_data(raw)
    X, y = df[FEATURES], df.cardio.astype(int)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=.2, random_state=42, stratify=y)
    prep = ColumnTransformer([("numeric", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), FEATURES)], verbose_feature_names_out=False)
    candidates = {
        "Random Forest": Pipeline([("prep", prep), ("model", RandomForestClassifier(n_estimators=180, max_depth=14, min_samples_leaf=8, n_jobs=-1, random_state=42, class_weight="balanced"))]),
        "SVM": Pipeline([("prep", prep), ("model", SVC(C=1.0, gamma="scale", probability=True, random_state=42))]),
    }
    if XGBOOST_AVAILABLE:
        candidates["XGBoost"] = Pipeline([("prep", prep), ("model", XGBClassifier(n_estimators=180, max_depth=5, learning_rate=.06, subsample=.85, colsample_bytree=.9, eval_metric="logloss", n_jobs=-1, random_state=42))])
    else:
        candidates["Gradient Boosting (XGBoost runtime unavailable)"] = Pipeline([("prep", prep), ("model", HistGradientBoostingClassifier(max_iter=180, max_leaf_nodes=25, learning_rate=.06, random_state=42))])
    # SVM is fit on a stratified 12k subset for an MVP-friendly training time; all models are scored on the same holdout.
    rows, fitted = [], {}
    for name, pipeline in candidates.items():
        if name == "SVM":
            sub_X, _, sub_y, _ = train_test_split(X_train, y_train, train_size=12000, random_state=42, stratify=y_train)
            pipeline.fit(sub_X, sub_y)
        else:
            pipeline.fit(X_train, y_train)
        fitted[name] = pipeline
        rows.append(metric_row(name, pipeline, X_test, y_test))
    best = max(rows, key=lambda row: row["roc_auc"])
    model = fitted[best["model"]]
    joblib.dump(model, OUT / "best_model.joblib")
    (OUT / "metadata.json").write_text(json.dumps({"best_model": best["model"], "feature_names": FEATURES, "metrics": rows, "training_rows": len(df), "source": "data/raw/cardio_train.csv", "xgboost_runtime_available": XGBOOST_AVAILABLE}, indent=2))
    print(json.dumps({"best": best, "rows_after_cleaning": len(df), "metrics": rows}, indent=2))

if __name__ == "__main__":
    main()
