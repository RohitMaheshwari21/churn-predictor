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

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main"
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-4">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-ink" : "text-muted"
                }`}>
                {active && <span aria-hidden="true" className="absolute top-0 h-0.5 w-10 rounded-full bg-accent" />}
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
