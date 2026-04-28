import type { Context } from "@netlify/functions";
import { predictAll } from "../lib/cadence/model";
import {
  DEFAULT_SKUS,
  generateSyntheticHistory,
} from "../lib/cadence/synthetic";
import type { Prediction } from "../lib/cadence/types";

interface Assertion {
  name: string;
  passed: boolean;
  detail?: string;
}

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const seed = Number(url.searchParams.get("seed") ?? 42);
  const historyDays = Number(url.searchParams.get("historyDays") ?? 90);
  const foodOrdersPerWeek = Number(
    url.searchParams.get("foodOrdersPerWeek") ?? 3,
  );
  const now = new Date();

  const { observations, foodOrderDates } = generateSyntheticHistory({
    seed,
    now,
    historyDays,
    skus: DEFAULT_SKUS,
    foodOrdersPerWeek,
  });

  const predictions = predictAll(observations, undefined, now);

  const assertions = runAssertions(predictions);
  const allPassed = assertions.every((a) => a.passed);

  return Response.json(
    {
      ok: allPassed,
      seed,
      historyDays,
      foodOrdersPerWeek,
      foodOrderCount: foodOrderDates.length,
      predictions: predictions.map(serializePrediction),
      observations: observations.map((o) => ({
        sku: o.sku,
        name: o.name,
        purchaseCount: o.purchases.length,
        purchases: o.purchases.map((p) => ({
          date: p.date.toISOString(),
          quantity: p.quantity,
        })),
      })),
      assertions,
    },
    { status: allPassed ? 200 : 500 },
  );
};

function runAssertions(predictions: Prediction[]): Assertion[] {
  const out: Assertion[] = [];
  const bySku = Object.fromEntries(predictions.map((p) => [p.sku, p]));

  const expectedRanges: Record<string, [number, number]> = {
    "milk-1l": [2, 5],
    "bread-400g": [3, 7],
    "eggs-12": [5, 10],
    "atta-5kg": [15, 28],
    "rice-5kg": [22, 38],
  };

  for (const [sku, [lo, hi]] of Object.entries(expectedRanges)) {
    const p = bySku[sku];
    if (!p) {
      out.push({ name: `predicted ${sku}`, passed: false, detail: "missing" });
      continue;
    }
    const c = p.cadenceDays;
    out.push({
      name: `${sku} cadence in [${lo}, ${hi}] days`,
      passed: c !== null && c >= lo && c <= hi,
      detail: c === null ? "no prediction" : `cadenceDays=${c.toFixed(2)}`,
    });
  }

  out.push({
    name: "milk has high or medium confidence (frequent purchase)",
    passed:
      bySku["milk-1l"]?.confidence === "high" ||
      bySku["milk-1l"]?.confidence === "medium",
    detail: `confidence=${bySku["milk-1l"]?.confidence}`,
  });

  out.push({
    name: "rice cadence > milk cadence (longer-lived staple)",
    passed:
      (bySku["rice-5kg"]?.cadenceDays ?? 0) >
      (bySku["milk-1l"]?.cadenceDays ?? 0),
    detail: `rice=${bySku["rice-5kg"]?.cadenceDays?.toFixed(2)}, milk=${bySku["milk-1l"]?.cadenceDays?.toFixed(2)}`,
  });

  out.push({
    name: "all SKUs have nextNeedDate",
    passed: predictions.every((p) => p.nextNeedDate !== null),
    detail: predictions
      .filter((p) => p.nextNeedDate === null)
      .map((p) => p.sku)
      .join(",") || "all set",
  });

  return out;
}

function serializePrediction(p: Prediction) {
  return {
    sku: p.sku,
    name: p.name,
    nextNeedDate: p.nextNeedDate?.toISOString() ?? null,
    cadenceDays: p.cadenceDays,
    baseCadenceDays: p.baseCadenceDays,
    dampeningDays: p.dampeningDays,
    observationCount: p.observationCount,
    intervalStdDevDays: p.intervalStdDevDays,
    confidence: p.confidence,
  };
}

export const config = {
  path: "/dev/cadence",
};
