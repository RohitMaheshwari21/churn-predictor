"""Load and clean the Telco Customer Churn dataset."""
from pathlib import Path

import pandas as pd

RAW_PATH = Path(__file__).resolve().parents[1] / "data" / "raw" / "telco_churn.csv"


def load_raw(path: Path = RAW_PATH) -> pd.DataFrame:
    return pd.read_csv(path)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # TotalCharges has blank strings for customers with tenure 0 (brand-new, not yet billed).
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df["TotalCharges"] = df["TotalCharges"].fillna(0.0)
    df["Churn"] = (df["Churn"] == "Yes").astype(int)
    df["SeniorCitizen"] = df["SeniorCitizen"].astype(int)
    return df.drop(columns=["customerID"])


def load_clean() -> pd.DataFrame:
    return clean(load_raw())


def quality_report(df: pd.DataFrame) -> None:
    print(f"Rows: {len(df):,}  Columns: {df.shape[1]}")
    print(f"Churn rate: {df['Churn'].mean():.1%}")
    missing = df.isna().sum()
    missing = missing[missing > 0]
    print("\nMissing values:", "none" if missing.empty else "\n" + missing.to_string())
    print("\nDtypes:\n", df.dtypes.value_counts().to_string())


if __name__ == "__main__":
    raw = load_raw()
    print("Raw blank TotalCharges:", (raw["TotalCharges"].str.strip() == "").sum())
    quality_report(load_clean())
