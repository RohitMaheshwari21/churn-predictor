"""Train and compare churn models, pick a cost-based threshold, save artifacts.

Leakage control: the test set is split off first and never used for model selection
or threshold choice. Both use out-of-fold predictions on the training set only.
"""
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, recall_score, precision_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

from data import load_clean

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
RANDOM_STATE = 42
COST_FN = 500  # missed churner: lost customer value
COST_FP = 50   # wasted retention offer

NUMERIC = ["tenure", "MonthlyCharges", "TotalCharges"]


def build_preprocessor(X):
    categorical = [c for c in X.columns if c not in NUMERIC]
    return ColumnTransformer([
        ("num", StandardScaler(), NUMERIC),
        ("cat", OneHotEncoder(drop="if_binary", handle_unknown="ignore"), categorical),
    ])


def candidate_models(pos_weight: float):
    return {
        "logistic_regression": LogisticRegression(max_iter=2000, class_weight="balanced"),
        "random_forest": RandomForestClassifier(
            n_estimators=300, min_samples_leaf=5, class_weight="balanced",
            random_state=RANDOM_STATE, n_jobs=-1),
        "xgboost": XGBClassifier(
            n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8,
            colsample_bytree=0.8, scale_pos_weight=pos_weight,
            eval_metric="logloss", random_state=RANDOM_STATE),
    }


def expected_cost(y, proba, threshold):
    pred = proba >= threshold
    fn = int(((y == 1) & ~pred).sum())
    fp = int(((y == 0) & pred).sum())
    return fn * COST_FN + fp * COST_FP


def best_threshold(y, proba):
    grid = np.round(np.arange(0.05, 0.95, 0.01), 2)
    costs = [expected_cost(y, proba, t) for t in grid]
    return float(grid[int(np.argmin(costs))])


def main():
    df = load_clean()
    X, y = df.drop(columns="Churn"), df["Churn"].to_numpy()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)

    pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    results, oof = {}, {}
    for name, model in candidate_models(pos_weight).items():
        pipe = Pipeline([("prep", build_preprocessor(X_train)), ("model", model)])
        proba = cross_val_predict(pipe, X_train, y_train, cv=cv, method="predict_proba")[:, 1]
        oof[name] = proba
        results[name] = {
            "cv_auc": round(roc_auc_score(y_train, proba), 4),
            "cv_pr_auc": round(average_precision_score(y_train, proba), 4),
        }
        print(f"{name:20s} CV AUC={results[name]['cv_auc']}  PR-AUC={results[name]['cv_pr_auc']}")

    # Select on CV AUC; prefer the simpler model if within 0.005 AUC of the best.
    best_auc = max(r["cv_auc"] for r in results.values())
    simplicity = ["logistic_regression", "random_forest", "xgboost"]
    chosen = next(n for n in simplicity if results[n]["cv_auc"] >= best_auc - 0.005)
    print(f"\nChosen model: {chosen}")

    threshold = best_threshold(y_train, oof[chosen])
    final = Pipeline([("prep", build_preprocessor(X_train)),
                      ("model", candidate_models(pos_weight)[chosen])]).fit(X_train, y_train)

    proba_test = final.predict_proba(X_test)[:, 1]
    pred_test = proba_test >= threshold
    baseline_none = int((y_test == 1).sum()) * COST_FN          # contact nobody
    baseline_all = int((y_test == 0).sum()) * COST_FP           # contact everybody
    cost_model = expected_cost(y_test, proba_test, threshold)
    cost_default = expected_cost(y_test, proba_test, 0.5)

    metrics = {
        "chosen_model": chosen,
        "cv_results": results,
        "threshold": threshold,
        "test": {
            "n": int(len(y_test)),
            "auc": round(roc_auc_score(y_test, proba_test), 4),
            "pr_auc": round(average_precision_score(y_test, proba_test), 4),
            "recall": round(recall_score(y_test, pred_test), 4),
            "precision": round(precision_score(y_test, pred_test), 4),
            "customers_flagged": int(pred_test.sum()),
        },
        "business_cost_on_test": {
            "assumptions": {"missed_churner": COST_FN, "wasted_offer": COST_FP},
            "contact_nobody": baseline_none,
            "contact_everybody": baseline_all,
            "model_at_default_0.5": cost_default,
            "model_at_optimal_threshold": cost_model,
            "saving_vs_contact_nobody": baseline_none - cost_model,
            "saving_pct_vs_contact_nobody": round(100 * (baseline_none - cost_model) / baseline_none, 1),
            "saving_vs_contact_everybody": baseline_all - cost_model,
            "saving_pct_vs_contact_everybody": round(100 * (baseline_all - cost_model) / baseline_all, 1),
        },
    }
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "metrics.json").write_text(json.dumps(metrics, indent=2))
    joblib.dump(final, ROOT / "model.joblib")
    X_test.assign(Churn=y_test).to_csv(REPORTS / "test_set.csv", index=False)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
