"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TABS = [
  { href: "/", label: "Home", icon: icon("M3 11l9-8 9 8M5 10v10h14V10") },
  { href: "/score", label: "Score", icon: icon("M4 18a8 8 0 1116 0M12 18l4-6") },
  { href: "/queue", label: "Queue", icon: icon("M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01") },
  { href: "/insights", label: "Insights", icon: icon("M5 20V10M12 20V4M19 20v-7") },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Phone layout: tabs at the bottom, within thumb reach. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-[560px] grid-cols-4">
        {TABS.map((t) => {
          const active = isActive(path, t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-primary" : "text-muted"
                }`}>
                {active && <span aria-hidden="true" className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />}
                {t.icon}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tablet / laptop layout: a fixed left sidebar. */
export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/80 px-4 py-6 backdrop-blur md:flex">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-onprimary">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 17a8 8 0 1116 0M12 17l4-5" />
          </svg>
        </span>
        <span className="display text-xl font-semibold">Churn Radar</span>
      </Link>

      <nav aria-label="Main">
        <ul className="space-y-1">
          {TABS.map((t) => {
            const active = isActive(path, t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors ${
                    active ? "bg-primarybg font-semibold text-primary" : "text-muted hover:bg-surface2 hover:text-ink"
                  }`}>
                  {t.icon}
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="mt-auto px-2 text-xs leading-relaxed text-muted">
        Explainable churn scoring on the public IBM Telco dataset. Runs entirely in your browser.
      </p>
    </aside>
  );
}
