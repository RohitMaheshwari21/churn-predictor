"""Generate notebooks/01_eda.ipynb (run once; then execute the notebook)."""
from pathlib import Path

import nbformat as nbf

nb = nbf.v4.new_notebook()
md, code = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell

nb.cells = [
    md("# 01 - Exploratory Data Analysis: who churns, and why?\n\n"
       "**Business question:** which customers are most likely to leave, so retention offers can be targeted?\n\n"
       "**Data:** Telco Customer Churn, 7,043 customers, 20 features. Overall churn is **26.5%**."),
    code("import sys; sys.path.append('../src')\n"
         "import pandas as pd, seaborn as sns, matplotlib.pyplot as plt\n"
         "from data import load_clean\n"
         "from eda import churn_by\n"
         "sns.set_theme(style='whitegrid')\n"
         "df = load_clean()\n"
         "print(df.shape, f\"churn rate: {df['Churn'].mean():.1%}\")\n"
         "df.head()"),
    md("## 1. Contract type is the strongest single signal"),
    code("churn_by(df, 'Contract')"),
    md("**So what:** month-to-month customers churn at **42.7%**, versus 11.3% on one-year and 2.8% on two-year "
       "contracts. Moving month-to-month customers onto longer contracts is the most direct retention lever."),
    md("## 2. Churn is highest early in the customer lifetime"),
    code("df['TenureBand'] = pd.cut(df['tenure'], [-1, 6, 12, 24, 48, 72])\n"
         "rate = df.groupby('TenureBand', observed=True)['Churn'].mean()\n"
         "rate.plot(kind='bar', color='#3b6ea5'); plt.ylabel('Churn rate'); plt.show()\n"
         "rate.round(3)"),
    md("**So what:** customers in their first 6 months churn at **52.9%**; after 4 years it falls to **9.5%**. "
       "Onboarding and the first-year experience deserve the retention budget."),
    md("## 3. Service and payment drivers"),
    code("for c in ['InternetService', 'PaymentMethod', 'TechSupport', 'OnlineSecurity']:\n"
         "    display(churn_by(df, c))"),
    md("**So what:**\n"
       "- **Fiber optic** customers churn at **41.9%** (DSL 19.0%). Worth checking price/quality of fiber.\n"
       "- **Electronic check** payers churn at **45.3%**; automatic payment methods sit at 15-17%. "
       "Auto-pay may reflect commitment, so nudging customers to auto-pay is a cheap test.\n"
       "- Customers **without TechSupport / OnlineSecurity** churn at ~42% versus ~15% with them."),
    md("## 4. Price and demographics"),
    code("print(df.groupby('Churn')['MonthlyCharges'].mean().round(2))\n"
         "display(churn_by(df, 'SeniorCitizen'))\n"
         "display(churn_by(df, 'Partner'))\n"
         "display(churn_by(df, 'gender'))"),
    md("**So what:** churners pay more per month (**$74.44** vs $61.27). Senior citizens (41.7%) and customers "
       "without a partner (33.0%) churn more. **Gender makes no difference** (26.9% vs 26.2%), so it is not "
       "a useful feature and should not drive decisions.\n\n"
       "## Takeaways for modeling\n"
       "1. The highest-risk profile is: month-to-month, short tenure, fiber optic, electronic check, no tech support.\n"
       "2. Classes are imbalanced (26.5% churn), so use AUC/recall and a cost-based threshold, not accuracy.\n"
       "3. `TotalCharges` is largely `tenure x MonthlyCharges`; watch for collinearity.\n"
       "4. Split the data **before** any fitting to avoid leakage."),
]

out = Path(__file__).resolve().parents[1] / "notebooks" / "01_eda.ipynb"
nbf.write(nb, out)
print("wrote", out)
