"""Export aggregate + test-set data for the web app (app/public/data/*.json).

customers.json holds the held-out test customers (same split as train.py) with their real
IDs and actual outcomes, so the app can rank them with the model and show whether the
prediction was right. segments.json holds churn rates by segment over the full dataset.
"""
import json
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from data import clean, load_raw
from train import RANDOM_STATE

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "public" / "data"


def segments(df: pd.DataFrame) -> dict:
    def table(series):
        g = df.groupby(series, observed=True)["Churn"].agg(n="size", rate="mean")
        return [{"label": str(k), "n": int(r.n), "rate": round(float(r.rate), 4)} for k, r in g.iterrows()]

    bands = pd.cut(df["tenure"], [-1, 6, 12, 24, 48, 72],
                   labels=["0-6 mo", "7-12 mo", "13-24 mo", "25-48 mo", "49-72 mo"])
    return {
        "overall": {"n": int(len(df)), "rate": round(float(df["Churn"].mean()), 4)},
        "Contract": table(df["Contract"]),
        "Tenure": table(bands),
        "Internet": table(df["InternetService"]),
        "Payment": table(df["PaymentMethod"]),
        "Tech support": table(df["TechSupport"]),
    }


def main():
    raw = load_raw()
    df = clean(raw)
    X, y = df.drop(columns="Churn"), df["Churn"]
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)

    customers = []
    for idx, row in X_test.iterrows():
        rec = {k: (v.item() if hasattr(v, "item") else v) for k, v in row.items()}
        rec["SeniorCitizen"] = str(rec["SeniorCitizen"])
        rec["id"] = raw.loc[idx, "customerID"]
        rec["churned"] = int(y_test.loc[idx])
        customers.append(rec)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "customers.json").write_text(json.dumps(customers, separators=(",", ":")))
    (OUT / "segments.json").write_text(json.dumps(segments(df), indent=1))
    print(f"customers.json: {len(customers)} rows, "
          f"{(OUT / 'customers.json').stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
