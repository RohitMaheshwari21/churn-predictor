"""EDA helpers: churn rate by segment and figures saved to reports/."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from data import load_clean

FIG_DIR = Path(__file__).resolve().parents[1] / "reports" / "figures"


def churn_by(df: pd.DataFrame, col: str) -> pd.DataFrame:
    out = df.groupby(col)["Churn"].agg(customers="size", churn_rate="mean")
    return out.sort_values("churn_rate", ascending=False)


def save_fig(name: str) -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(FIG_DIR / f"{name}.png", dpi=150)
    plt.close()


def make_figures(df: pd.DataFrame) -> None:
    sns.set_theme(style="whitegrid")
    overall = df["Churn"].mean()

    for col in ["Contract", "InternetService", "PaymentMethod", "TechSupport"]:
        t = churn_by(df, col).reset_index()
        ax = sns.barplot(data=t, x=col, y="churn_rate", color="#3b6ea5")
        ax.axhline(overall, ls="--", color="gray", label=f"Overall {overall:.0%}")
        ax.set_ylabel("Churn rate")
        ax.yaxis.set_major_formatter(lambda v, _: f"{v:.0%}")
        ax.legend()
        plt.xticks(rotation=15)
        save_fig(f"churn_by_{col}")

    df["TenureBand"] = pd.cut(df["tenure"], [-1, 6, 12, 24, 48, 72],
                              labels=["0-6", "7-12", "13-24", "25-48", "49-72"])
    t = df.groupby("TenureBand", observed=True)["Churn"].mean().reset_index()
    ax = sns.barplot(data=t, x="TenureBand", y="Churn", color="#3b6ea5")
    ax.set_xlabel("Tenure (months)")
    ax.set_ylabel("Churn rate")
    ax.yaxis.set_major_formatter(lambda v, _: f"{v:.0%}")
    save_fig("churn_by_tenure")

    sns.kdeplot(data=df, x="MonthlyCharges", hue="Churn", common_norm=False, fill=True)
    save_fig("monthly_charges_by_churn")


if __name__ == "__main__":
    d = load_clean()
    print(f"Overall churn: {d['Churn'].mean():.1%}\n")
    for c in ["Contract", "InternetService", "PaymentMethod", "TechSupport",
              "OnlineSecurity", "PaperlessBilling", "SeniorCitizen", "Partner", "gender"]:
        print(churn_by(d, c).assign(churn_rate=lambda x: (x.churn_rate * 100).round(1)), "\n")
    d["TenureBand"] = pd.cut(d["tenure"], [-1, 6, 12, 24, 48, 72])
    print((d.groupby("TenureBand", observed=True)["Churn"].mean() * 100).round(1), "\n")
    print("Avg monthly charge by churn:\n", d.groupby("Churn")["MonthlyCharges"].mean().round(2))
    make_figures(d)
    print("\nFigures saved to", FIG_DIR)
