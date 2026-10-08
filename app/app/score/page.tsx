"use client";

import { useMemo, useState } from "react";
import { Analysis } from "@/components/Analysis";
import { Chip, Choice, ErrorNote, Loading, Meter, RiskPill, ScreenTitle, Segmented, Slider, Switch } from "@/components/ui";
import { ADDONS, ADDON_LABEL, PRESETS, normalize } from "@/lib/customer";
import { useModel } from "@/lib/data";
import { predict } from "@/lib/predict";
import type { Customer } from "@/lib/predict";
import { pct } from "@/lib/risk";

const SECTIONS = ["Account", "Services", "Profile"];

export default function ScorePage() {
  const { data: model, error } = useModel();
  const [customer, setCustomer] = useState<Customer>(() => normalize(PRESETS["New fiber customer"]));
  const [section, setSection] = useState(SECTIONS[0]);

  const set = (k: string, v: string | number) => setCustomer((c) => normalize({ ...c, [k]: v }));
  const yes = (k: string) => customer[k] === "Yes";
  const toggle = (k: string) => (v: boolean) => set(k, v ? "Yes" : "No");
  const pred = useMemo(() => (model ? predict(model, customer) : null), [model, customer]);
  const noNet = customer.InternetService === "No";

  return (
    <>
      <ScreenTitle title="Score a customer" subtitle="Change any detail and the risk updates instantly." />
      {error && <ErrorNote message={error} />}
      {!model && !error && <Loading what="model" />}

      {model && pred && (
        <>
          <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-line bg-paper/90 px-4 py-2.5 backdrop-blur"
            aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-between gap-3">
              <p className="display text-4xl font-semibold leading-none">
                {pct(pred.probability)}
                <span className="ml-2 font-sans text-sm font-normal text-muted">chance of leaving</span>
              </p>
              <RiskPill p={pred.probability} threshold={model.threshold} />
            </div>
            <div className="mt-2.5"><Meter p={pred.probability} threshold={model.threshold} /></div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Example customers">
            {Object.keys(PRESETS).map((n) => (
              <Chip key={n} onClick={() => setCustomer(normalize(PRESETS[n]))}>{n}</Chip>
            ))}
          </div>

          <div className="rise mb-5 space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
            <Segmented label="Customer details" value={section} options={SECTIONS} onChange={setSection} />

            {section === "Account" && (
              <div className="space-y-5">
                <Slider label="Time as a customer" value={Number(customer.tenure)} min={0} max={72}
                  format={(v) => `${v} mo`} onChange={(v) => set("tenure", v)} />
                <Slider label="Monthly bill" value={Number(customer.MonthlyCharges)} min={18} max={120}
                  format={(v) => `$${v}`} onChange={(v) => set("MonthlyCharges", v)} />
                <Segmented label="Contract" value={String(customer.Contract)}
                  options={["Month-to-month", "One year", "Two year"]} onChange={(v) => set("Contract", v)} />
                <Choice label="Payment method" value={String(customer.PaymentMethod)}
                  options={["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"]}
                  onChange={(v) => set("PaymentMethod", v)} />
                <Switch label="Paperless billing" checked={yes("PaperlessBilling")} onChange={toggle("PaperlessBilling")} />
              </div>
            )}

            {section === "Services" && (
              <div className="space-y-5">
                <Segmented label="Internet" value={String(customer.InternetService)}
                  options={["DSL", "Fiber optic", "No"]} onChange={(v) => set("InternetService", v)} />
                <div className="space-y-2">
                  <Switch label="Phone service" checked={yes("PhoneService")} onChange={toggle("PhoneService")} />
                  <Switch label="Multiple lines" checked={yes("MultipleLines")} onChange={toggle("MultipleLines")}
                    disabled={!yes("PhoneService")} note={!yes("PhoneService") ? "Needs phone service" : undefined} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Add-ons</p>
                  {ADDONS.map((a) => (
                    <Switch key={a} label={ADDON_LABEL[a]} checked={yes(a)} onChange={toggle(a)}
                      disabled={noNet} note={noNet ? "Needs internet service" : undefined} />
                  ))}
                </div>
              </div>
            )}

            {section === "Profile" && (
              <div className="space-y-3">
                <Switch label="Senior citizen" checked={customer.SeniorCitizen === "1"}
                  onChange={(v) => set("SeniorCitizen", v ? "1" : "0")} />
                <Switch label="Has a partner" checked={yes("Partner")} onChange={toggle("Partner")} />
                <Switch label="Has dependents" checked={yes("Dependents")} onChange={toggle("Dependents")} />
                <Segmented label="Gender" value={String(customer.gender)} options={["Female", "Male"]}
                  onChange={(v) => set("gender", v)} hint="No measurable effect on churn in this data." />
              </div>
            )}
          </div>

          <Analysis model={model} customer={customer} onChange={setCustomer} />
        </>
      )}
    </>
  );
}
