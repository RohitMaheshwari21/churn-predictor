// Churn scoring that mirrors the sklearn pipeline (StandardScaler + OneHotEncoder + LogisticRegression).
// The model is linear, so each feature's contribution to the log-odds is exact: coef * (x - mean).

export type ModelJson = {
  intercept: number;
  threshold: number;
  numeric: Record<string, { mean: number; scale: number }>;
  categorical: Record<string, { values: string[]; dropped: string | null }>;
  feature_names: string[];
  coef: number[];
  means: number[];
  metrics: {
    auc: number;
    recall: number;
    precision: number;
    cost: Record<string, number | Record<string, number>>;
  };
};

export type Customer = Record<string, string | number>;

export type Reason = { feature: string; impact: number; direction: "raises" | "lowers" };

export type Prediction = {
  probability: number;
  highRisk: boolean;
  reasons: Reason[];
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function predict(model: ModelJson, customer: Customer): Prediction {
  const numericCols = Object.keys(model.numeric);
  const catCols = Object.keys(model.categorical);

  // Build the transformed vector in the same order sklearn does, remembering which
  // original feature each column belongs to so contributions can be grouped.
  const x: number[] = [];
  const owner: string[] = [];

  for (const col of numericCols) {
    const { mean, scale } = model.numeric[col];
    x.push((Number(customer[col]) - mean) / scale);
    owner.push(col);
  }
  for (const col of catCols) {
    const { values, dropped } = model.categorical[col];
    const v = String(customer[col]);
    for (const cat of values) {
      if (cat === dropped) continue; // binary features keep only the non-dropped column
      x.push(v === cat ? 1 : 0);
      owner.push(col);
    }
  }
  if (x.length !== model.coef.length) {
    throw new Error(`Feature mismatch: built ${x.length}, model expects ${model.coef.length}`);
  }

  let logit = model.intercept;
  const byFeature = new Map<string, number>();
  for (let i = 0; i < x.length; i++) {
    logit += model.coef[i] * x[i];
    const contribution = model.coef[i] * (x[i] - model.means[i]);
    byFeature.set(owner[i], (byFeature.get(owner[i]) ?? 0) + contribution);
  }

  const probability = sigmoid(logit);
  const reasons: Reason[] = [...byFeature.entries()]
    .map(([feature, impact]) => ({
      feature,
      impact,
      direction: (impact >= 0 ? "raises" : "lowers") as Reason["direction"],
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return { probability, highRisk: probability >= model.threshold, reasons };
}
