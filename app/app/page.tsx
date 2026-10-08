"use client";

import Link from "next/link";
import { Card, ErrorNote, H2, Loading, Meter, RiskPill } from "@/components/ui";
import { useScored, useSegments } from "@/lib/data";
import { pct } from "@/lib/risk";

const btn = "flex min-h-14 items-center justify-center rounded-2xl px-5 text-base font-semibold active:scale-[0.98]";

export default function Home() {
  const { data: seg, error: e1 } = useSegments();
  const { model, scored, error: e2 } = useScored();
  const error = e1 ?? e2;

  const find = (key: string, label: string) =>
    (seg?.[key] as { label: string; rate: number; n: number }[] | undefined)?.find((r) => r.label === label);
  const signals = seg
    ? [
        { t: "Month-to-month contract", r: find("Contract", "Month-to-month") },
        { t: "First 6 months as a customer", r: find("Tenure", "0-6 mo") },
        { t: "Pays by electronic check", r: find("Payment", "Electronic check") },
        { t: "No tech support", r: find("Tech support", "No") },
      ]
    : [];

  return (
    <>
      <header className="rise pb-6 pt-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Churn Radar</p>
        <h1 className="display mt-2 text-[2.6rem] font-semibold leading-[1.05]">
          Know who is about to leave
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-[1.05rem] text-muted">
          Score any telecom customer, see exactly why, and test what could keep them.
        </p>
        <div className="mt-5 grid gap-3">
          <Link href="/score" className={`${btn} bg-ink text-paper`}>Score a customer</Link>
          <Link href="/queue" className={`${btn} border border-line bg-surface`}>Open retention queue</Link>
        </div>
      </header>

      {error && <ErrorNote message={error} />}
      {!error && !seg && <Loading what="overview" />}

      {seg && (
        <div className="space-y-4">
          <section className="rise grid grid-cols-3 gap-2" aria-label="Key numbers">
            {[
              { v: pct(seg.overall.rate), l: "of customers leave" },
              { v: model ? model.metrics.auc.toFixed(2) : "–", l: "model AUC" },
              { v: model ? `${Math.round(model.metrics.cost.saving_pct_vs_contact_everybody as number)}%` : "–", l: "cost saved" },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl border border-line bg-surface p-3 text-center shadow-[var(--shadow)]">
                <p className="display text-[1.7rem] font-semibold leading-none">{k.v}</p>
                <p className="mt-1.5 text-xs text-muted">{k.l}</p>
              </div>
            ))}
          </section>

          <Card className="rise">
            <H2>Biggest warning signs</H2>
            <ul className="space-y-3.5">
              {signals.map(({ t, r }) =>
                r ? (
                  <li key={t}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.95rem] font-medium">{t}</span>
                      <span className="display text-xl font-semibold text-high">{pct(r.rate)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-line" aria-hidden="true">
                      <div className="h-2 rounded-full bg-high" style={{ width: `${(r.rate / 0.6) * 100}%` }} />
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Churn rate in each group, against {pct(seg.overall.rate)} overall.{" "}
              <Link href="/insights" className="font-semibold text-ink underline underline-offset-2">See all drivers</Link>
            </p>
          </Card>

          <Card className="rise">
            <H2>Call these first</H2>
            {!scored || !model ? (
              <Loading what="customers" />
            ) : (
              <ul className="divide-y divide-line">
                {scored.slice(0, 5).map(({ customer, p }) => (
                  <li key={customer.id}>
                    <Link href="/queue" className="block py-3 first:pt-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold tabular-nums">{customer.id}</span>
                        <RiskPill p={p} threshold={model.threshold} />
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1"><Meter p={p} threshold={model.threshold} /></div>
                        <span className="w-10 text-right text-sm font-semibold tabular-nums">{pct(p)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rise">
            <H2>How it works</H2>
            <ol className="space-y-2 text-[0.95rem]">
              <li><strong>1. Learn.</strong> A model studies 5,600 past customers and who left.</li>
              <li><strong>2. Score.</strong> It gives each new customer a chance of leaving, with reasons.</li>
              <li><strong>3. Act.</strong> It recommends contacting anyone above the point where an offer pays for itself.</li>
            </ol>
            <p className="mt-3 text-xs text-muted">
              Built on the public IBM Telco dataset. Scores come from a calibrated logistic regression and run entirely in your browser.
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
