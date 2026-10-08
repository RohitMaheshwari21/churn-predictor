"use client";

import { useMemo } from "react";
import { predict } from "@/lib/predict";
import type { Customer, ModelJson } from "@/lib/predict";
import { suggest } from "@/lib/actions";
import { normalize, describe, featureLabel } from "@/lib/customer";
import { TIERS, pct, tierOf } from "@/lib/risk";
import { Card, Gauge, H2, RiskPill } from "./ui";

/** Gauge + "why" + "what could help" for one customer. Shared by Score and Queue. */
export function Analysis({
  model, customer, onChange,
}: { model: ModelJson; customer: Customer; onChange: (c: Customer) => void }) {
  const pred = useMemo(() => predict(model, customer), [model, customer]);
  const tier = tierOf(pred.probability, model.threshold);
  const ideas = useMemo(() => suggest(model, customer, pred.probability), [model, customer, pred.probability]);
  // Total paid is just tenure x bill, so fold it into "time as a customer" to avoid double-counting.
  const merged = useMemo(() => {
    const total = pred.reasons.find((r) => r.feature === "TotalCharges");
    return pred.reasons
      .filter((r) => r.feature !== "TotalCharges")
      .map((r) => {
        if (r.feature !== "tenure" || !total) return r;
        const impact = r.impact + total.impact;
        return { ...r, impact, direction: (impact >= 0 ? "raises" : "lowers") as typeof r.direction };
      })
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }, [pred.reasons]);
  const top = merged.slice(0, 5);
  const showsBill = top.some((r) => r.feature === "MonthlyCharges");
  const maxImpact = Math.max(...top.map((r) => Math.abs(r.impact)), 0.001);

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <Gauge p={pred.probability} threshold={model.threshold} />
        <div className="mt-1 flex justify-center"><RiskPill p={pred.probability} threshold={model.threshold} /></div>
        <p className="mt-2 text-[0.95rem] font-medium">{TIERS[tier].action}</p>
        <p className="mx-auto mt-1 max-w-[30ch] text-xs text-muted">
          The black tick marks {pct(model.threshold)}: above it, a retention offer pays for itself on average.
        </p>
      </Card>

      <Card>
        <H2>Why this score</H2>
        <ul className="space-y-3">
          {top.map((r) => {
            const up = r.direction === "raises";
            return (
              <li key={r.feature}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.95rem] font-medium">{describe(r.feature, customer)}</span>
                  <span className={`shrink-0 text-xs font-semibold ${up ? "text-high" : "text-safe"}`}>
                    <span aria-hidden="true">{up ? "▲ " : "▼ "}</span>
                    {up ? "raises risk" : "lowers risk"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-line" aria-hidden="true">
                    <div className="h-1.5 rounded-full"
                      style={{ width: `${(Math.abs(r.impact) / maxImpact) * 100}%`, background: up ? "var(--high)" : "var(--safe)" }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs text-muted">{featureLabel(r.feature)}</span>
                </div>
              </li>
            );
          })}
        </ul>
        {showsBill && (
          <p className="mt-3 text-xs text-muted">
            The monthly bill overlaps with the services it pays for, so read it together with them: a higher bill
            can look protective once internet type and add-ons are already counted.
          </p>
        )}
      </Card>

      <Card>
        <H2>What could help</H2>
        {ideas.length === 0 ? (
          <p className="text-sm text-muted">
            {tier === "low"
              ? "This customer looks stable. No change needed."
              : "None of the changes we can test lowers this customer's risk meaningfully."}
          </p>
        ) : (
          <ul className="space-y-2">
            {ideas.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface2 p-3">
                <div className="min-w-0">
                  <p className="text-[0.95rem] font-semibold">{s.title}</p>
                  <p className="text-sm text-muted">
                    {pct(pred.probability)} → <span className="font-semibold text-safe">{pct(s.newP)}</span>{" "}
                    <span className="text-xs">({Math.round(s.delta * 100)} pts)</span>
                  </p>
                </div>
                <button type="button" onClick={() => onChange(normalize({ ...customer, ...s.change }))}
                  className="min-h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-paper active:scale-95">
                  Try it
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">
          What-if estimates come from patterns in past customers. They show association, not a guaranteed result,
          and ignore any change in price or discount.
        </p>
      </Card>
    </div>
  );
}
