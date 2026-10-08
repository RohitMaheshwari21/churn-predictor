import type { Customer, ModelJson } from "./predict";
import { predict } from "./predict";
import { normalize } from "./customer";

type Action = {
  id: string;
  title: string;
  applies: (c: Customer) => boolean;
  change: Customer;
};

const hasNet = (c: Customer) => c.InternetService !== "No";

const ACTIONS: Action[] = [
  { id: "c1", title: "Offer a 1-year contract", applies: (c) => c.Contract === "Month-to-month", change: { Contract: "One year" } },
  { id: "c2", title: "Offer a 2-year contract", applies: (c) => c.Contract !== "Two year", change: { Contract: "Two year" } },
  {
    id: "pay", title: "Move to automatic payment",
    applies: (c) => c.PaymentMethod === "Electronic check" || c.PaymentMethod === "Mailed check",
    change: { PaymentMethod: "Bank transfer (automatic)" },
  },
  { id: "ts", title: "Add tech support", applies: (c) => hasNet(c) && c.TechSupport === "No", change: { TechSupport: "Yes" } },
  { id: "os", title: "Add online security", applies: (c) => hasNet(c) && c.OnlineSecurity === "No", change: { OnlineSecurity: "Yes" } },
];

export type Suggestion = { id: string; title: string; change: Customer; newP: number; delta: number };

/** Re-score the customer under each applicable action; keep those that lower risk. */
export function suggest(model: ModelJson, customer: Customer, p: number): Suggestion[] {
  return ACTIONS.filter((a) => a.applies(customer))
    .map((a) => {
      const newP = predict(model, normalize({ ...customer, ...a.change })).probability;
      return { id: a.id, title: a.title, change: a.change, newP, delta: newP - p };
    })
    .filter((s) => s.delta < -0.005)
    .sort((a, b) => a.delta - b.delta);
}
