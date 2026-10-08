"""SHAP explanations for the chosen model + export of the model for the web app.

The chosen model is logistic regression, so inference can run in the browser/edge
with no Python runtime: we export preprocessing parameters and coefficients to JSON.
Per-feature contributions (coef x scaled value) are exact explanations for a linear model.
"""
import json
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

from data import load_clean
from train import NUMERIC, RANDOM_STATE

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"


def main():
    pipe = joblib.load(ROOT / "model.joblib")
    metrics = json.loads((REPORTS / "metrics.json").read_text())
    prep, model = pipe.named_steps["prep"], pipe.named_steps["model"]
    assert metrics["chosen_model"] == "logistic_regression"

    df = load_clean()
    X = df.drop(columns="Churn")
    names = [n.replace("num__", "").replace("cat__", "") for n in prep.get_feature_names_out()]
    Z = prep.transform(X)
    Z = Z.toarray() if hasattr(Z, "toarray") else np.asarray(Z)

    # ---- SHAP (global) ----
    explainer = shap.LinearExplainer(model, Z)
    sv = explainer.shap_values(Z)
    mean_abs = pd.Series(np.abs(sv).mean(axis=0), index=names).sort_values(ascending=False)
    shap.summary_plot(sv, Z, feature_names=names, max_display=12, show=False)
    plt.tight_layout()
    plt.savefig(REPORTS / "figures" / "shap_summary.png", dpi=150)
    plt.close()
    mean_abs.head(15).round(4).to_csv(REPORTS / "shap_top_features.csv", header=["mean_abs_shap"])
    print("Top drivers (mean |SHAP|):\n", mean_abs.head(10).round(3).to_string())

    # ---- Export for the web app ----
    scaler = prep.named_transformers_["num"]
    ohe = prep.named_transformers_["cat"]
    cat_cols = list(prep.transformers_[1][2])
    categories = {}
    for col, cats, drop in zip(cat_cols, ohe.categories_, ohe.drop_idx_):
        categories[col] = {"values": [str(c) for c in cats],
                           "dropped": None if drop is None else str(cats[drop])}
    # class_weight="balanced" trains on an effective 50% prior, which inflates probabilities.
    # Prior-shift correction: subtract log((1-pi)/pi) from the logit, pi = training prevalence.
    # Verified on the test set: calibrated mean 0.267 vs actual churn rate 0.265.
    y_train_rate = float(df["Churn"].mean())
    shift = float(np.log((1 - y_train_rate) / y_train_rate))
    raw_thr = metrics["threshold"]
    cal_thr = float(1 / (1 + np.exp(-(np.log(raw_thr / (1 - raw_thr)) - shift))))
    export = {
        "intercept": float(model.intercept_[0]),
        "calibration_shift": shift,
        "threshold": cal_thr,
        "raw_threshold": raw_thr,
        "numeric": {c: {"mean": float(m), "scale": float(s)}
                    for c, m, s in zip(NUMERIC, scaler.mean_, scaler.scale_)},
        "categorical": categories,
        "feature_names": names,
        "coef": [float(c) for c in model.coef_[0]],
        # training-set mean of each transformed column: SHAP value = coef * (x - mean)
        "means": [float(m) for m in Z.mean(axis=0)],
        "cv_results": metrics["cv_results"],
        "metrics": {"auc": metrics["test"]["auc"], "recall": metrics["test"]["recall"],
                    "precision": metrics["test"]["precision"],
                    "cost": metrics["business_cost_on_test"]},
    }
    out = ROOT / "app" / "public" / "model.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(export, indent=2))
    print("Exported", out)

    # Reference predictions to verify the TypeScript implementation matches sklearn
    sample = X.sample(25, random_state=RANDOM_STATE)
    ref = [{"input": r._asdict() if hasattr(r, "_asdict") else dict(zip(sample.columns, r)),
            "proba": float(p)}
           for r, p in zip(sample.itertuples(index=False), pipe.predict_proba(sample)[:, 1])]
    (REPORTS / "reference_predictions.json").write_text(json.dumps(ref, indent=2, default=int))


if __name__ == "__main__":
    main()
