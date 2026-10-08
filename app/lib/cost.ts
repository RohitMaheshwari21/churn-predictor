// Cost of a retention policy "contact customers whose risk >= threshold".
// A missed churner costs `fn`; an unnecessary offer costs `fp`.

export type CostPoint = { t: number; cost: number };

export function costAt(scored: { p: number; y: number }[], t: number, fn: number, fp: number): number {
  let total = 0;
  for (const s of scored) {
    const flagged = s.p >= t;
    if (!flagged && s.y === 1) total += fn;
    if (flagged && s.y === 0) total += fp;
  }
  return total;
}

export function costCurve(scored: { p: number; y: number }[], fn: number, fp: number) {
  const curve: CostPoint[] = [];
  for (let i = 1; i <= 90; i++) {
    const t = i / 100;
    curve.push({ t, cost: costAt(scored, t, fn, fp) });
  }
  const best = curve.reduce((a, b) => (b.cost < a.cost ? b : a));
  const everybody = scored.filter((s) => s.y === 0).length * fp;
  const nobody = scored.filter((s) => s.y === 1).length * fn;
  const flaggedShare = scored.filter((s) => s.p >= best.t).length / scored.length;
  return { curve, best, everybody, nobody, flaggedShare };
}
