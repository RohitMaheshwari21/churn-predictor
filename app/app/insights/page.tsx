"use client";

import { useMemo, useState } from "react";
import { Card, Chip, ErrorNote, H2, Loading, ScreenTitle, Segmented, Slider } from "@/components/ui";
import { costCurve } from "@/lib/cost";
import { useScored, useSegments } from "@/lib/data";
import type { Segments } from "@/lib/data";
import type { ModelJson } from "@/lib/predict";
import type { Scored } from "@/lib/data";
import { money, pct } from "@/lib/risk";

const VIEWS = ["Drivers", "Model", "Cost"];

export default function InsightsPage() {
  const [view, setView] = useState(VIEWS[0]);
  const { data: segments, error: e1 } = useSegments();
  const { model, scored, error: e2 } = useScored();
  const error = e1 ?? e2;

  return (
    <>
      <ScreenTitle title="Insights" subtitle="What drives churn, how far to trust the model, and what it saves." />
      <div className="rise mb-4 lg:max-w-md"><Segmented label="View" value={view} options={VIEWS} onChange={setView} /></div>
      {error && <ErrorNote message={error} />}
      {!error && (!segments || !model || !scored) && <Loading what="insights" />}
      {segments && model && scored && (
        <div className="rise">
          {view === "Drivers" && <Drivers segments={segments} />}
          {view === "Model" && <ModelView model={model} scored={scored} />}
          {view === "Cost" && <CostView scored={scored} />}
        </div>
      )}
    </>
  );
}

/* ---------- Drivers ---------- */

function Drivers({ segments }: { segments: Segments }) {
  const keys = ["Contract", "Tenure", "Internet", "Payment", "Tech support"];
  const [key, setKey] = useState(keys[0]);
  const rows = segments[key] as { label: string; n: number; rate: number }[];
  const avg = segments.overall.rate;
  const max = 0.6;
  const hi = rows.reduce((a, b) => (b.rate > a.rate ? b : a));
  const lo = rows.reduce((a, b) => (b.rate < a.rate ? b : a));

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:col-span-2 lg:flex-wrap" role="group" aria-label="Segment">
        {keys.map((k) => <Chip key={k} active={key === k} onClick={() => setKey(k)}>{k}</Chip>)}
      </div>
      <Card>
        <H2>Churn rate by {key.toLowerCase()}</H2>
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[0.95rem] font-medium">{r.label}</span>
                <span className="display text-lg font-semibold tabular-nums">{pct(r.rate)}</span>
              </div>
              <div className="relative h-3 rounded-full bg-line" role="img" aria-label={`${r.label}: ${pct(r.rate)} churn, ${r.n} customers`}>
                <div className="h-3 rounded-full" style={{ width: `${(r.rate / max) * 100}%`, background: r.rate > avg ? "var(--high)" : "var(--safe)" }} />
                <div className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `${(avg / max) * 100}%` }} aria-hidden="true" />
              </div>
              <p className="mt-0.5 text-xs text-muted">{r.n.toLocaleString()} customers</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">Black tick: overall average ({pct(avg)}). Based on all {segments.overall.n.toLocaleString()} customers.</p>
      </Card>
      <Card>
        <H2>So what</H2>
        <p className="text-[0.95rem]">
          <strong>{hi.label}</strong> customers leave at <strong>{pct(hi.rate)}</strong>, while{" "}
          <strong>{lo.label}</strong> customers leave at <strong>{pct(lo.rate)}</strong>
          {" "}({(hi.rate / lo.rate).toFixed(1)}× apart). These are associations, not proven causes.
        </p>
      </Card>
    </div>
  );
}

/* ---------- Model ---------- */

function Tile({ label, value, note, tint }: { label: string; value: string; note: string; tint: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${tint}`}>
      <p className="text-xs opacity-90">{label}</p>
      <p className="display text-2xl font-semibold">{value}</p>
      <p className="text-[0.7rem] leading-tight opacity-90">{note}</p>
    </div>
  );
}

function ModelView({ model, scored }: { model: ModelJson; scored: Scored[] }) {
  const bins = useMemo(() => {
    const edges = [0, 0.1, 0.2, 0.4, 0.6, 1.01];
    return edges.slice(0, -1).map((lo, i) => {
      const hi = edges[i + 1];
      const g = scored.filter((s) => s.p >= lo && s.p < hi);
      return {
        range: `${Math.round(lo * 100)}–${Math.min(100, Math.round(hi * 100))}%`,
        n: g.length,
        predicted: g.reduce((a, s) => a + s.p, 0) / Math.max(g.length, 1),
        actual: g.filter((s) => s.customer.churned).length / Math.max(g.length, 1),
      };
    });
  }, [scored]);
  const names: Record<string, string> = { logistic_regression: "Logistic regression", random_forest: "Random forest", xgboost: "XGBoost" };
  const cv = model.cv_results ?? {};

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Card>
        <H2>Held-out test performance</H2>
        <div className="grid grid-cols-3 gap-2">
          <Tile tint="bg-infobg text-info" label="AUC" value={model.metrics.auc.toFixed(2)} note="ranking quality" />
          <Tile tint="bg-primarybg text-primary" label="Recall" value={pct(model.metrics.recall)} note="leavers caught" />
          <Tile tint="bg-warnbg text-warn" label="Precision" value={pct(model.metrics.precision)} note="flagged who leave" />
        </div>
        <p className="mt-3 text-xs text-muted">
          Precision is low on purpose: a missed customer costs 10× more than an unneeded offer, so the model flags generously.
        </p>
      </Card>

      <Card>
        <H2>Can you trust the percentages?</H2>
        <p className="mb-3 text-sm text-muted">Predicted risk against what really happened, on {scored.length.toLocaleString()} unseen customers.</p>
        <table className="w-full text-sm">
          <caption className="sr-only">Calibration: predicted versus actual churn by risk band</caption>
          <thead><tr className="text-left text-xs text-muted">
            <th scope="col" className="pb-1 font-medium">Risk band</th>
            <th scope="col" className="pb-1 text-right font-medium">Customers</th>
            <th scope="col" className="pb-1 text-right font-medium">Predicted</th>
            <th scope="col" className="pb-1 text-right font-medium">Actual</th>
          </tr></thead>
          <tbody>
            {bins.map((b) => (
              <tr key={b.range} className="border-t border-line">
                <th scope="row" className="py-2 text-left font-medium">{b.range}</th>
                <td className="py-2 text-right tabular-nums">{b.n}</td>
                <td className="py-2 text-right tabular-nums">{pct(b.predicted)}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{pct(b.actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Predicted and actual track each other, so a 40% score means roughly 4 in 10 such customers leave.</p>
      </Card>

      {Object.keys(cv).length > 0 && (
        <Card>
          <H2>Why logistic regression?</H2>
          <table className="w-full text-sm">
            <caption className="sr-only">Cross-validated AUC by model</caption>
            <tbody>
              {Object.entries(cv).map(([k, v]) => (
                <tr key={k} className="border-t border-line first:border-0">
                  <th scope="row" className="py-2 text-left font-medium">{names[k] ?? k}</th>
                  <td className="py-2 text-right tabular-nums">AUC {v.cv_auc.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">All three tie within noise, so the simplest and most explainable model won.</p>
        </Card>
      )}

      <Card>
        <H2>Limits to know</H2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          <li>One public dataset (7,043 customers) from a single point in time.</li>
          <li>Patterns, not causes: what-if changes are estimates, not promises.</li>
          <li>Dollar figures use assumed costs and should be replaced with real ones.</li>
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Cost tuner ---------- */

function CostView({ scored }: { scored: Scored[] }) {
  const [fn, setFn] = useState(500);
  const [fp, setFp] = useState(50);
  const rows = useMemo(() => scored.map((s) => ({ p: s.p, y: s.customer.churned })), [scored]);
  const r = useMemo(() => costCurve(rows, fn, fp), [rows, fn, fp]);

  const W = 300, H = 130, padL = 8, padR = 8, padT = 10, padB = 22;
  const costs = r.curve.map((c) => c.cost);
  const lo = Math.min(...costs), hi = Math.max(...costs);
  const x = (t: number) => padL + (t / 0.9) * (W - padL - padR);
  const y = (c: number) => padT + (1 - (c - lo) / Math.max(hi - lo, 1)) * (H - padT - padB);
  const path = r.curve.map((c, i) => `${i ? "L" : "M"}${x(c.t).toFixed(1)} ${y(c.cost).toFixed(1)}`).join(" ");
  const baseline = Math.min(r.everybody, r.nobody);
  const saving = baseline - r.best.cost;

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Card>
        <H2>Set your costs</H2>
        <div className="space-y-5">
          <Slider label="Cost of losing a customer" value={fn} min={100} max={2000} step={50} format={money} onChange={setFn} />
          <Slider label="Cost of a retention offer" value={fp} min={10} max={200} step={5} format={money} onChange={setFp} />
        </div>
      </Card>

      <Card aria-live="polite" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <H2>Best policy</H2>
        <p className="display text-3xl font-semibold leading-tight">
          Contact customers at <span className="text-accent">{pct(r.best.t)}</span> risk or higher
        </p>
        <p className="mt-1 text-sm text-muted">That is {pct(r.flaggedShare)} of customers. Total cost {money(r.best.cost)}.</p>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
          aria-label={`Total cost against risk threshold. Lowest cost ${money(r.best.cost)} at ${pct(r.best.t)}.`}>
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
          <line x1={x(r.best.t)} x2={x(r.best.t)} y1={padT} y2={H - padB} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={x(r.best.t)} cy={y(r.best.cost)} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
          {[0, 0.3, 0.6, 0.9].map((t) => (
            <text key={t} x={x(t)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">{Math.round(t * 100)}%</text>
          ))}
        </svg>
        <p className="text-center text-xs text-muted">Risk threshold for contacting a customer</p>
      </Card>

      <Card>
        <H2>Versus the alternatives</H2>
        <dl className="space-y-2 text-[0.95rem]">
          <div className="flex justify-between"><dt>Contact nobody</dt><dd className="tabular-nums">{money(r.nobody)}</dd></div>
          <div className="flex justify-between"><dt>Contact everybody</dt><dd className="tabular-nums">{money(r.everybody)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <dt>Use the model</dt><dd className="tabular-nums">{money(r.best.cost)}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-xl bg-safebg p-3 text-sm font-semibold text-safe">
          {saving > 0
            ? `Saves ${money(saving)} (${Math.round((saving / baseline) * 100)}%) over the best simple alternative on ${scored.length.toLocaleString()} test customers.`
            : "At these costs the model offers no saving over the simplest alternative."}
        </p>
        <p className="mt-2 text-xs text-muted">
          The best threshold here is tuned on these same test customers, so the saving is slightly optimistic.
          The project README reports the stricter figure, with the threshold chosen on training data only.
        </p>
      </Card>
    </div>
  );
}
