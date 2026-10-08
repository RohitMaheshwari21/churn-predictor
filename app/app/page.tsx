"use client";

import { useEffect, useMemo, useState } from "react";
import { predict } from "@/lib/predict";
import type { Customer, ModelJson } from "@/lib/predict";

const YES_NO = ["Yes", "No"];
const ADDON = ["Yes", "No", "No internet service"];

// Each field: label + options (or numeric range). Keys match the training columns.
const SELECTS: { key: string; label: string; options: string[] }[] = [
  { key: "Contract", label: "Contract", options: ["Month-to-month", "One year", "Two year"] },
  { key: "InternetService", label: "Internet service", options: ["DSL", "Fiber optic", "No"] },
  {
    key: "PaymentMethod",
    label: "Payment method",
    options: ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"],
  },
  { key: "PaperlessBilling", label: "Paperless billing", options: YES_NO },
  { key: "TechSupport", label: "Tech support", options: ADDON },
  { key: "OnlineSecurity", label: "Online security", options: ADDON },
  { key: "OnlineBackup", label: "Online backup", options: ADDON },
  { key: "DeviceProtection", label: "Device protection", options: ADDON },
  { key: "StreamingTV", label: "Streaming TV", options: ADDON },
  { key: "StreamingMovies", label: "Streaming movies", options: ADDON },
  { key: "PhoneService", label: "Phone service", options: YES_NO },
  { key: "MultipleLines", label: "Multiple lines", options: ["Yes", "No", "No phone service"] },
  { key: "gender", label: "Gender", options: ["Female", "Male"] },
  { key: "SeniorCitizen", label: "Senior citizen", options: ["0", "1"] },
  { key: "Partner", label: "Has partner", options: YES_NO },
  { key: "Dependents", label: "Has dependents", options: YES_NO },
];

const PRESETS: Record<string, Customer> = {
  "High-risk example": {
    gender: "Female", SeniorCitizen: "0", Partner: "No", Dependents: "No", tenure: 2,
    PhoneService: "Yes", MultipleLines: "No", InternetService: "Fiber optic", OnlineSecurity: "No",
    OnlineBackup: "No", DeviceProtection: "No", TechSupport: "No", StreamingTV: "No",
    StreamingMovies: "No", Contract: "Month-to-month", PaperlessBilling: "Yes",
    PaymentMethod: "Electronic check", MonthlyCharges: 80, TotalCharges: 160,
  },
  "Loyal example": {
    gender: "Male", SeniorCitizen: "0", Partner: "Yes", Dependents: "Yes", tenure: 60,
    PhoneService: "Yes", MultipleLines: "Yes", InternetService: "DSL", OnlineSecurity: "Yes",
    OnlineBackup: "Yes", DeviceProtection: "Yes", TechSupport: "Yes", StreamingTV: "No",
    StreamingMovies: "No", Contract: "Two year", PaperlessBilling: "No",
    PaymentMethod: "Credit card (automatic)", MonthlyCharges: 70, TotalCharges: 4200,
  },
};

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function Home() {
  const [model, setModel] = useState<ModelJson | null>(null);
  const [customer, setCustomer] = useState<Customer>(PRESETS["High-risk example"]);

  useEffect(() => {
    fetch("/model.json").then((r) => r.json()).then(setModel);
  }, []);

  const set = (key: string, value: string | number) => setCustomer((c) => ({ ...c, [key]: value }));

  // Keep TotalCharges consistent with tenure x monthly charges, as it is in the data.
  const setBilling = (key: "tenure" | "MonthlyCharges", value: number) =>
    setCustomer((c) => {
      const next = { ...c, [key]: value };
      next.TotalCharges = Math.round(Number(next.tenure) * Number(next.MonthlyCharges) * 100) / 100;
      return next;
    });

  const result = useMemo(() => (model ? predict(model, customer) : null), [model, customer]);
  const top = result?.reasons.slice(0, 5) ?? [];
  const maxImpact = Math.max(...top.map((r) => Math.abs(r.impact)), 0.001);
  const cost = model?.metrics.cost as Record<string, number> | undefined;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Customer Churn Predictor</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Enter a telecom customer&apos;s details to estimate their chance of leaving and see which
          factors drive that estimate. Logistic regression trained on 7,043 customers; runs entirely
          in your browser.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_380px]">
        <section aria-label="Customer details" className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => setCustomer(PRESETS[name])}
                className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Tenure: {customer.tenure} months</span>
              <input
                type="range" min={0} max={72} value={Number(customer.tenure)}
                onChange={(e) => setBilling("tenure", Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Monthly charges: ${Number(customer.MonthlyCharges)}</span>
              <input
                type="range" min={18} max={120} value={Number(customer.MonthlyCharges)}
                onChange={(e) => setBilling("MonthlyCharges", Number(e.target.value))}
                className="w-full"
              />
            </label>
            {SELECTS.map((f) => (
              <label key={f.key} className="text-sm">
                <span className="mb-1 block font-medium">{f.label}</span>
                <select
                  value={String(customer[f.key])}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
                >
                  {f.options.map((o) => (
                    <option key={o} value={o} className="text-black">{o}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section aria-live="polite" className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500">Churn probability</h2>
            {result ? (
              <>
                <p className="mt-1 text-5xl font-semibold tabular-nums">
                  {(result.probability * 100).toFixed(0)}%
                </p>
                <p
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                    result.highRisk
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  }`}
                >
                  {result.highRisk ? "Flag for retention offer" : "No action needed"}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Decision threshold {(model!.threshold * 100).toFixed(0)}%, chosen to minimise cost
                  (missed churner $500 vs wasted offer $50), not the default 50%.
                </p>

                <h3 className="mt-5 text-sm font-medium">Top factors</h3>
                <ul className="mt-2 space-y-2">
                  {top.map((r) => (
                    <li key={r.feature} className="text-sm">
                      <div className="flex justify-between">
                        <span>{r.feature}</span>
                        <span className="text-zinc-500">{r.direction === "raises" ? "raises risk" : "lowers risk"}</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-2 rounded ${r.direction === "raises" ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${(Math.abs(r.impact) / maxImpact) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Loading model…</p>
            )}
          </section>

          {model && cost && (
            <section className="rounded-xl border border-zinc-200 p-5 text-sm dark:border-zinc-800">
              <h2 className="font-medium">Model performance (held-out test set)</h2>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><dt className="text-xs text-zinc-500">AUC</dt><dd className="text-lg font-semibold">{model.metrics.auc.toFixed(2)}</dd></div>
                <div><dt className="text-xs text-zinc-500">Recall</dt><dd className="text-lg font-semibold">{(model.metrics.recall * 100).toFixed(0)}%</dd></div>
                <div><dt className="text-xs text-zinc-500">Precision</dt><dd className="text-lg font-semibold">{(model.metrics.precision * 100).toFixed(0)}%</dd></div>
              </dl>
              <p className="mt-3 text-xs text-zinc-500">
                On 1,409 test customers: contacting everyone costs {money(cost.contact_everybody)}; the model
                costs {money(cost.model_at_optimal_threshold)}, a {cost.saving_pct_vs_contact_everybody}% saving.
                Contacting nobody would cost {money(cost.contact_nobody)}. Cost figures rely on assumed
                per-customer values.
              </p>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
