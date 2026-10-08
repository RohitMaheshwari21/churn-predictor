"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Analysis } from "@/components/Analysis";
import { Card, Chip, ErrorNote, Loading, Meter, RiskPill, ScreenTitle, Switch } from "@/components/ui";
import { describe } from "@/lib/customer";
import { useScored } from "@/lib/data";
import type { Scored } from "@/lib/data";
import { useMedia } from "@/lib/media";
import type { Customer, ModelJson } from "@/lib/predict";
import { HIGH_AT, pct, tierOf } from "@/lib/risk";

const PAGE = 30;
const FILTERS = ["All", "High risk", "Elevated", "Month-to-month"] as const;
type Filter = (typeof FILTERS)[number];

export default function QueuePage() {
  const { model, scored, error } = useScored();
  const desktop = useMedia("(min-width: 1024px)");
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [reveal, setReveal] = useState(false);
  const [open, setOpen] = useState<Scored | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const list = useMemo(() => {
    if (!scored || !model) return [];
    const q = query.trim().toLowerCase();
    return scored.filter(({ customer, p }) => {
      if (q && !customer.id.toLowerCase().includes(q)) return false;
      if (filter === "High risk") return p >= HIGH_AT;
      if (filter === "Elevated") return p >= model.threshold && p < HIGH_AT;
      if (filter === "Month-to-month") return customer.Contract === "Month-to-month";
      return true;
    });
  }, [scored, model, filter, query]);

  const topN = 100;
  const backtest = useMemo(() => {
    if (!scored) return null;
    const left = scored.slice(0, topN).filter((s) => s.customer.churned === 1).length;
    const base = scored.filter((s) => s.customer.churned === 1).length / scored.length;
    return { left, rate: left / topN, base };
  }, [scored]);

  // On a laptop the detail panel is always visible, so default to the riskiest customer.
  const selected = open ?? (desktop && scored ? scored[0] : null);

  return (
    <>
      <ScreenTitle title="Retention queue"
        subtitle="Customers the model has never seen, ranked by risk. Start at the top." />
      {error && <ErrorNote message={error} />}
      {!scored && !error && <Loading what="customers" />}

      {scored && model && backtest && (
        <div className="lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div>
            <div className="rise mb-3">
              <label htmlFor="q" className="sr-only">Search by customer ID</label>
              <input id="q" type="search" inputMode="search" autoComplete="off" placeholder="Search customer ID…"
                value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
                className="min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base placeholder:text-muted" />
            </div>

            <div className="rise mb-3 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap" role="group" aria-label="Filter customers">
              {FILTERS.map((f) => (
                <Chip key={f} active={filter === f} onClick={() => { setFilter(f); setShown(PAGE); }}>{f}</Chip>
              ))}
            </div>

            <div className="rise mb-4"><Switch label="Reveal what actually happened"
              note="Backtest: compare each prediction with the real outcome" checked={reveal} onChange={setReveal} /></div>

            {reveal && (
              <Card className="mb-4 bg-infobg!">
                <p className="text-[0.95rem] text-ink">
                  Of the <strong>{topN} highest-risk</strong> customers, <strong>{backtest.left} ({pct(backtest.rate)})</strong>{" "}
                  really left, against <strong>{pct(backtest.base)}</strong> across everyone.{" "}
                  That is <strong>{(backtest.rate / backtest.base).toFixed(1)}× more likely</strong> than picking at random.
                </p>
              </Card>
            )}

            <p className="mb-2 text-sm text-muted" aria-live="polite">
              {list.length.toLocaleString()} customer{list.length === 1 ? "" : "s"}
            </p>

            {list.length === 0 ? (
              <Card><p className="text-sm text-muted">No customers match. Try a different filter or ID.</p></Card>
            ) : (
              <ul className="space-y-2">
                {list.slice(0, shown).map((s) => {
                  const isSel = desktop && selected?.customer.id === s.customer.id;
                  return (
                    <li key={s.customer.id}>
                      <button type="button" aria-pressed={desktop ? isSel : undefined}
                        onClick={(e) => { trigger.current = e.currentTarget; setOpen(s); }}
                        className={`w-full rounded-2xl border bg-surface p-3.5 text-left shadow-[var(--shadow)] transition-colors active:scale-[0.99] ${
                          isSel ? "border-primary bg-primarybg" : "border-line hover:border-primary/50"
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold tabular-nums">{s.customer.id}</span>
                          <RiskPill p={s.p} threshold={model.threshold} />
                        </div>
                        <p className="mt-0.5 text-sm text-muted">
                          {s.customer.Contract} · {s.customer.tenure} mo · ${Number(s.customer.MonthlyCharges).toFixed(0)}/mo
                        </p>
                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="flex-1"><Meter p={s.p} threshold={model.threshold} /></div>
                          <span className="w-10 text-right text-sm font-semibold tabular-nums">{pct(s.p)}</span>
                        </div>
                        {reveal && (
                          <p className={`mt-2 text-xs font-semibold ${s.customer.churned ? "text-high" : "text-safe"}`}>
                            <span aria-hidden="true">{s.customer.churned ? "✕ " : "✓ "}</span>
                            {s.customer.churned ? "Actually left" : "Actually stayed"}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {shown < list.length && (
              <button type="button" onClick={() => setShown((n) => n + PAGE)}
                className="mt-4 min-h-12 w-full rounded-xl border border-line bg-surface font-semibold hover:bg-surface2">
                Show more ({Math.min(PAGE, list.length - shown)})
              </button>
            )}
          </div>

          {selected && (
            <DetailPanel key={selected.customer.id} item={selected} model={model} reveal={reveal} inline={desktop}
              onClose={() => { setOpen(null); trigger.current?.focus(); }} />
          )}
        </div>
      )}
    </>
  );
}

/** Full-screen sheet on phones; sticky side panel on laptops. */
function DetailPanel({
  item, model, reveal, inline, onClose,
}: { item: Scored; model: ModelJson; reveal: boolean; inline: boolean; onClose: () => void }) {
  const [customer, setCustomer] = useState<Customer>(item.customer);
  const closeRef = useRef<HTMLButtonElement>(null);
  const changed = JSON.stringify(customer) !== JSON.stringify(item.customer);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Modal behaviour (focus, Escape, scroll lock) only applies to the phone sheet.
  useEffect(() => {
    if (inline) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [inline]);

  const facts = ["Contract", "InternetService", "PaymentMethod", "tenure", "MonthlyCharges"];
  const body = (
    <>
      <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
        <h2 id="sheet-title" className="display text-xl font-semibold tabular-nums">{item.customer.id}</h2>
        {!inline && (
          <button ref={closeRef} type="button" onClick={onClose}
            className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold">Close</button>
        )}
      </div>

      <ul className="mb-4 flex flex-wrap gap-2" aria-label="Customer facts">
        {facts.map((f) => (
          <li key={f} className="rounded-full bg-primarybg px-3 py-1 text-sm text-primary">{describe(f, customer)}</li>
        ))}
      </ul>

      {reveal && (
        <p className={`mb-4 rounded-xl p-3 text-sm font-semibold ${item.customer.churned ? "bg-highbg text-high" : "bg-safebg text-safe"}`}>
          <span aria-hidden="true">{item.customer.churned ? "✕ " : "✓ "}</span>
          Actual outcome: {item.customer.churned ? "this customer left" : "this customer stayed"}
          {" "}(model said {pct(item.p)}, {tierOf(item.p, model.threshold)} risk)
        </p>
      )}

      <Analysis model={model} customer={customer} onChange={setCustomer} />

      {changed && (
        <button type="button" onClick={() => setCustomer(item.customer)}
          className="mt-4 min-h-12 w-full rounded-xl border border-line bg-surface font-semibold hover:bg-surface2">
          Reset to the original customer
        </button>
      )}
    </>
  );

  if (inline) {
    return (
      <section aria-labelledby="sheet-title"
        className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:p-1 lg:pr-2">
        {body}
      </section>
    );
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="sheet-title"
      className="sheet-in fixed inset-0 z-40 overflow-y-auto bg-paper px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
      <div className="mx-auto max-w-xl">{body}</div>
    </div>
  );
}
