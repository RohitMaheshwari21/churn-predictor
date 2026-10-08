# Project: Churn Predictor
Goal: portfolio project for data analyst / data scientist roles, deployed on Vercel.

## Rules
- Python, pandas, scikit-learn, XGBoost, SHAP. Frontend: Next.js + Tailwind.
- Notebooks for exploration; reusable logic goes in src/ as .py modules.
- No data leakage: split before any fitting. random_state=42.
- Every analysis step ends with a plain-English "so what" comment.
- Never commit secrets; use .env and .gitignore.
- Explain non-obvious choices briefly so the author can defend them in interviews.

## Structure
data/raw  notebooks/  src/  reports/  app/ (added later)  README.md

## Business framing
Missed churner costs $500 (lost customer value); a wasted retention offer costs $50.
Choose the decision threshold on this cost, not 0.5.
