import type { Customer } from "./predict";

export const ADDONS = [
  "OnlineSecurity",
  "OnlineBackup",
  "DeviceProtection",
  "TechSupport",
  "StreamingTV",
  "StreamingMovies",
] as const;

export const ADDON_LABEL: Record<string, string> = {
  OnlineSecurity: "Online security",
  OnlineBackup: "Online backup",
  DeviceProtection: "Device protection",
  TechSupport: "Tech support",
  StreamingTV: "Streaming TV",
  StreamingMovies: "Streaming movies",
};

export const PRESETS: Record<string, Customer> = {
  "New fiber customer": {
    gender: "Female", SeniorCitizen: "0", Partner: "No", Dependents: "No", tenure: 2,
    PhoneService: "Yes", MultipleLines: "No", InternetService: "Fiber optic", OnlineSecurity: "No",
    OnlineBackup: "No", DeviceProtection: "No", TechSupport: "No", StreamingTV: "No",
    StreamingMovies: "No", Contract: "Month-to-month", PaperlessBilling: "Yes",
    PaymentMethod: "Electronic check", MonthlyCharges: 80, TotalCharges: 160,
  },
  "Loyal long-timer": {
    gender: "Male", SeniorCitizen: "0", Partner: "Yes", Dependents: "Yes", tenure: 60,
    PhoneService: "Yes", MultipleLines: "Yes", InternetService: "DSL", OnlineSecurity: "Yes",
    OnlineBackup: "Yes", DeviceProtection: "Yes", TechSupport: "Yes", StreamingTV: "No",
    StreamingMovies: "No", Contract: "Two year", PaperlessBilling: "No",
    PaymentMethod: "Credit card (automatic)", MonthlyCharges: 70, TotalCharges: 4200,
  },
  "Mid-tenure senior": {
    gender: "Female", SeniorCitizen: "1", Partner: "No", Dependents: "No", tenure: 18,
    PhoneService: "Yes", MultipleLines: "No", InternetService: "Fiber optic", OnlineSecurity: "No",
    OnlineBackup: "Yes", DeviceProtection: "No", TechSupport: "No", StreamingTV: "Yes",
    StreamingMovies: "Yes", Contract: "One year", PaperlessBilling: "Yes",
    PaymentMethod: "Mailed check", MonthlyCharges: 95, TotalCharges: 1710,
  },
};

/** Keep the form self-consistent so users cannot create impossible customers. */
export function normalize(c: Customer): Customer {
  const next = { ...c };
  const noNet = next.InternetService === "No";
  for (const k of ADDONS) {
    if (noNet) next[k] = "No internet service";
    else if (next[k] === "No internet service") next[k] = "No";
  }
  if (next.PhoneService === "No") next.MultipleLines = "No phone service";
  else if (next.MultipleLines === "No phone service") next.MultipleLines = "No";
  next.TotalCharges = Math.round(Number(next.tenure) * Number(next.MonthlyCharges) * 100) / 100;
  return next;
}

const LABEL: Record<string, string> = {
  tenure: "Time as a customer",
  MonthlyCharges: "Monthly bill",
  TotalCharges: "Total paid so far",
  Contract: "Contract",
  InternetService: "Internet",
  PaymentMethod: "Payment method",
  PaperlessBilling: "Billing",
  SeniorCitizen: "Age group",
  Partner: "Partner",
  Dependents: "Dependents",
  PhoneService: "Phone service",
  MultipleLines: "Multiple lines",
  gender: "Gender",
  ...ADDON_LABEL,
};

export const featureLabel = (f: string) => LABEL[f] ?? f;

/** Plain-English value for a feature of a given customer. */
export function describe(feature: string, c: Customer): string {
  const v = String(c[feature]);
  switch (feature) {
    case "tenure": return `${v} month${v === "1" ? "" : "s"} with us`;
    case "MonthlyCharges": return `$${Number(v).toFixed(0)} per month`;
    case "TotalCharges": return `$${Math.round(Number(v)).toLocaleString("en-US")} paid in total`;
    case "Contract": return `${v} contract`;
    case "InternetService": return v === "No" ? "No internet service" : `${v} internet`;
    case "PaperlessBilling": return v === "Yes" ? "Paperless billing" : "Paper bills";
    case "SeniorCitizen": return v === "1" ? "Senior citizen" : "Not a senior";
    case "Partner": return v === "Yes" ? "Has a partner" : "No partner";
    case "Dependents": return v === "Yes" ? "Has dependents" : "No dependents";
    case "PaymentMethod": return `Pays by ${v.charAt(0).toLowerCase()}${v.slice(1)}`;
    default:
      if (feature in ADDON_LABEL) {
        const name = ADDON_LABEL[feature];
        return v === "Yes" ? `Has ${name.toLowerCase()}` : v === "No" ? `No ${name.toLowerCase()}` : `${name}: n/a`;
      }
      return `${featureLabel(feature)}: ${v}`;
  }
}
