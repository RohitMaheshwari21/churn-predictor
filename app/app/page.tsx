"use client";

import Link from "next/link";
import { Card, ErrorNote, H2, Loading, Meter, RiskPill } from "@/components/ui";
import { useScored, useSegments } from "@/lib/data";
import { pct } from "@/lib/risk";

const btn = "flex min-h-14 items-center justify-center rounded-2xl px-6 text-base font-semibold active:scale-[0.98]";

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

  const kpis = seg
    ? [
        { v: pct(seg.overall.rate), l: "of customers leave", tint: "bg-accentbg text-accent" },
        { v: model ? model.metrics.auc.toFixed(2) : "–", l: "model AUC (ranking quality)", tint: "bg-primarybg text-primary" },
        {
          v: model ? `${Math.round(model.metrics.cost.saving_pct_vs_contact_everybody as number)}%` : "–",
          l: "cost saved vs contacting everyone", tint: "bg-safebg text-safe",
        },
      ]
    : [];

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      {/* Hero */}
      <header className="rise overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--hero-a)] to-[var(--hero-b)] p-6 text-[var(--hero-ink)] shadow-[var(--shadow)] md:p-9 lg:col-span-7">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] opacity-80">Churn Radar</p>
        <h1 className="display mt-3 text-[2.5rem] font-semibold leading-[1.05] md:text-[3.2rem]">
          Know who is about to leave<span className="text-[#ffb08a]">.</span>
        </h1>
        <p className="mt-3 max-w-[34ch] text-[1.05rem] opacity-85 md:text-lg">
          Score any telecom customer, see exactly why, and test what could keep them.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/score" className={`${btn} bg-[var(--hero-ink)] text-[#0a3c42]`}>Score a customer</Link>
          <Link href="/queue" className={`${btn} border border-[var(--hero-ink)]/40 text-[var(--hero-ink)] hover:bg-white/10`}>
            Open retention queue
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <section className="rise grid grid-cols-3 gap-2 lg:col-span-5 lg:grid-cols-1 lg:gap-3" aria-label="Key numbers">
        {error && <div className="col-span-3 lg:col-span-1"><ErrorNote message={error} /></div>}
        {!error && !seg && <div className="col-span-3 lg:col-span-1"><Loading what="overview" /></div>}
        {kpis.map((k) => (
          <div key={k.l} className={`flex flex-col justify-center rounded-2xl p-3 text-center lg:flex-row lg:items-center lg:gap-4 lg:p-5 lg:text-left ${k.tint}`}>
            <p className="display text-[1.8rem] font-semibold leading-none lg:min-w-[5.5rem] lg:text-[2.4rem]">{k.v}</p>
            <p className="mt-1.5 text-xs font-medium leading-tight opacity-90 lg:mt-0 lg:text-sm">{k.l}</p>
          </div>
        ))}
      </section>

      {seg && (
        <>
          <Card className="rise lg:col-span-7">
            <H2>Biggest warning signs</H2>
            <ul className="space-y-4">
              {signals.map(({ t, r }) =>
                r ? (
                  <li key={t}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.95rem] font-medium">{t}</span>
                      <span className="display text-xl font-semibold text-high">{pct(r.rate)}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-line" aria-hidden="true">
                      <div className="h-2.5 rounded-full bg-gradient-to-r from-[var(--warn)] to-[var(--high)]"
                        style={{ width: `${(r.rate / 0.6) * 100}%` }} />
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Churn rate in each group, against {pct(seg.overall.rate)} overall.{" "}
              <Link href="/insights" className="font-semibold text-primary underline underline-offset-2">See all drivers</Link>
            </p>
          </Card>

          <Card className="rise lg:col-span-5">
            <H2>Call these first</H2>
            {!scored || !model ? (
              <Loading what="customers" />
            ) : (
              <ul className="divide-y divide-line">
                {scored.slice(0, 5).map(({ customer, p }) => (
                  <li key={customer.id}>
                    <Link href="/queue" className="block py-3 first:pt-0 hover:opacity-80">
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

          <Card className="rise lg:col-span-12">
            <H2>How it works</H2>
            <ol className="grid gap-4 text-[0.95rem] md:grid-cols-3">
              {[
                ["1", "Learn", "A model studies 5,600 past customers and who left.", "bg-infobg text-info"],
                ["2", "Score", "It gives each new customer a chance of leaving, with reasons.", "bg-primarybg text-primary"],
                ["3", "Act", "It recommends contacting anyone above the point where an offer pays for itself.", "bg-accentbg text-accent"],
              ].map(([n, t, d, tint]) => (
                <li key={n} className="flex gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold ${tint}`} aria-hidden="true">{n}</span>
                  <span><strong>{t}.</strong> {d}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted">
              Built on the public IBM Telco dataset. Scores come from a calibrated logistic regression and run entirely in your browser.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
