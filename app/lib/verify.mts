// Parity check: TypeScript predictions must match sklearn's on 25 reference customers.
// Run: node --experimental-strip-types lib/verify.mts
import { readFileSync } from "node:fs";
import { predict } from "./predict.ts";
import type { ModelJson, Customer } from "./predict.ts";

const model: ModelJson = JSON.parse(readFileSync("public/model.json", "utf8"));
const ref: { input: Customer; proba: number }[] = JSON.parse(
  readFileSync("../reports/reference_predictions.json", "utf8"),
);

let maxDiff = 0;
for (const r of ref) {
  maxDiff = Math.max(maxDiff, Math.abs(predict(model, r.input).probability - r.proba));
}
console.log(`checked ${ref.length} customers, max |diff| = ${maxDiff.toExponential(2)}`);
if (maxDiff > 1e-9) {
  console.error("MISMATCH between TypeScript and sklearn");
  process.exit(1);
}
console.log("OK: TypeScript matches sklearn");
