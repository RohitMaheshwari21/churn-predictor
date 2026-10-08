export type Tier = "low" | "elevated" | "high";

/** High risk is 40%+. Elevated means above the cost-optimal action threshold. */
export const HIGH_AT = 0.4;

export const tierOf = (p: number, threshold: number): Tier =>
  p >= HIGH_AT ? "high" : p >= threshold ? "elevated" : "low";

// Each tier has a text label and a distinct glyph, so meaning never relies on colour alone.
export const TIERS: Record<Tier, { label: string; action: string; glyph: string; fg: string; bg: string }> = {
  low: { label: "Low risk", action: "No action needed", glyph: "●", fg: "text-safe", bg: "bg-safebg" },
  elevated: { label: "Elevated", action: "Worth a retention offer", glyph: "▲", fg: "text-warn", bg: "bg-warnbg" },
  high: { label: "High risk", action: "Prioritise for outreach", glyph: "◆", fg: "text-high", bg: "bg-highbg" },
};

export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
