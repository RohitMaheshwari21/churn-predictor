"use client";

import { useId } from "react";
import { TIERS, pct, tierOf } from "@/lib/risk";
import type { Tier } from "@/lib/risk";

const TIER_STROKE: Record<Tier, string> = {
  low: "var(--safe)",
  elevated: "var(--warn)",
  high: "var(--high)",
};

export function Card({ children, className = "", ...rest }: React.ComponentProps<"section">) {
  return (
    <section {...rest} className={`rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)] ${className}`}>
      {children}
    </section>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="rise mb-5">
      <h1 className="display text-[2rem] font-semibold leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-[0.95rem] text-muted">{subtitle}</p>}
    </header>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>;
}

export function RiskPill({ p, threshold }: { p: number; threshold: number }) {
  const t = TIERS[tierOf(p, threshold)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${t.bg} ${t.fg}`}>
      <span aria-hidden="true">{t.glyph}</span>
      {t.label}
    </span>
  );
}

/** Semi-circular gauge with a tick at the action threshold. */
export function Gauge({ p, threshold }: { p: number; threshold: number }) {
  const R = 80;
  const L = Math.PI * R;
  const tier = tierOf(p, threshold);
  const a = Math.PI * (1 - threshold);
  const tick = (r: number) => `${100 + r * Math.cos(a)},${100 - r * Math.sin(a)}`;
  return (
    <svg viewBox="0 0 200 118" className="mx-auto w-full max-w-[280px]" role="img"
      aria-label={`Churn probability ${pct(p)}. Action threshold ${pct(threshold)}.`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" />
      <path
        d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={TIER_STROKE[tier]} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={L} strokeDashoffset={L * (1 - Math.max(p, 0.004))}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1), stroke .3s" }}
      />
      <polyline points={`${tick(69)} ${tick(91)}`} stroke="var(--ink)" strokeWidth="2.5" />
      <text x="100" y="92" textAnchor="middle" className="display" fontSize="40" fontWeight="600" fill="var(--ink)">
        {pct(p)}
      </text>
      <text x="100" y="112" textAnchor="middle" fontSize="10.5" fill="var(--muted)">
        chance of leaving
      </text>
    </svg>
  );
}

/** Thin horizontal meter, used in the sticky score bar and list rows. */
export function Meter({ p, threshold }: { p: number; threshold: number }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-line" aria-hidden="true">
      <div
        className="h-2 rounded-full"
        style={{ width: `${Math.max(p, 0.01) * 100}%`, background: TIER_STROKE[tierOf(p, threshold)], transition: "width .4s" }}
      />
      <div className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${threshold * 100}%` }} />
    </div>
  );
}

export function Segmented({
  label, value, options, onChange, hint,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void; hint?: string }) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="flex rounded-xl border border-line bg-surface2 p-1">
        {options.map((o) => (
          <label key={o} className="relative min-w-0 flex-1">
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)}
              className="peer sr-only" />
            <span className="flex min-h-11 items-center justify-center rounded-lg px-1.5 text-center text-[0.9rem] leading-tight text-muted transition-colors peer-checked:bg-ink peer-checked:font-semibold peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-accent">
              {o}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

export function Choice({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="grid gap-2">
        {options.map((o) => (
          <label key={o} className="relative">
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)}
              className="peer sr-only" />
            <span className="flex min-h-12 items-center justify-between rounded-xl border border-line bg-surface px-3.5 text-[0.95rem] transition-colors peer-checked:border-ink peer-checked:bg-surface2 peer-checked:font-semibold peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-accent">
              {o}
              <span aria-hidden="true" className={`h-4 w-4 rounded-full border-2 ${value === o ? "border-ink bg-ink" : "border-line"}`} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Switch({
  label, checked, onChange, disabled, note,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 text-left disabled:opacity-45">
      <span>
        <span className="block text-[0.95rem]">{label}</span>
        {note && <span className="block text-xs text-muted">{note}</span>}
      </span>
      <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-line"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-paper transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </button>
  );
}

export function Slider({
  label, value, min, max, step = 1, format, onChange,
}: { label: string; value: number; min: number; max: number; step?: number; format: (v: number) => string; onChange: (v: number) => void }) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const btn = "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-xl leading-none active:scale-95";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        <output htmlFor={id} className="display text-xl font-semibold">{format(value)}</output>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step))}>−</button>
        <input id={id} type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full" />
        <button type="button" className={btn} aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step))}>+</button>
      </div>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
        active ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink"
      }`}>
      {children}
    </button>
  );
}

export function Loading({ what = "data" }: { what?: string }) {
  return (
    <div role="status" className="space-y-3" aria-label={`Loading ${what}`}>
      <div className="h-24 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-24 animate-pulse rounded-2xl bg-line/60" />
      <span className="sr-only">Loading {what}…</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-high bg-highbg p-4 text-sm text-high">
      <strong className="block">Something went wrong</strong>
      {message}. Check your connection and reload the page.
    </div>
  );
}
