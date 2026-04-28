import {
  DEFAULT_PRIORS,
  type Confidence,
  type ModelPriors,
  type Prediction,
  type SKUObservations,
} from "./types";

const DAY_MS = 86_400_000;

export function predictSKU(
  obs: SKUObservations,
  priors: ModelPriors = DEFAULT_PRIORS,
  now: Date = new Date(),
): Prediction {
  const sortedPurchases = [...obs.purchases].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const n = sortedPurchases.length;

  if (n === 0) {
    return {
      sku: obs.sku,
      name: obs.name,
      nextNeedDate: null,
      cadenceDays: null,
      baseCadenceDays: null,
      dampeningDays: 0,
      observationCount: 0,
      intervalStdDevDays: null,
      confidence: "insufficient",
    };
  }

  const intervals: number[] = [];
  for (let i = 1; i < n; i++) {
    const days =
      (sortedPurchases[i].date.getTime() -
        sortedPurchases[i - 1].date.getTime()) /
      DAY_MS;
    intervals.push(days);
  }
  const intervalSum = intervals.reduce((s, d) => s + d, 0);

  const posteriorShape = priors.shape + intervals.length;
  const posteriorRate = priors.rate + intervalSum;
  const baseCadenceDays =
    posteriorShape > 1 ? posteriorRate / (posteriorShape - 1) : null;

  const lastPurchase = sortedPurchases[n - 1].date;
  const dampeningDays = computeDampening(
    obs.foodOrderDates ?? [],
    lastPurchase,
    priors,
  );
  const cadenceDays =
    baseCadenceDays === null ? null : baseCadenceDays + dampeningDays;

  const nextNeedDate =
    cadenceDays === null
      ? null
      : new Date(lastPurchase.getTime() + cadenceDays * DAY_MS);

  const intervalStdDevDays =
    intervals.length >= 2 ? stdDev(intervals) : null;

  return {
    sku: obs.sku,
    name: obs.name,
    nextNeedDate,
    cadenceDays,
    baseCadenceDays,
    dampeningDays,
    observationCount: n,
    intervalStdDevDays,
    confidence: scoreConfidence(n, intervalStdDevDays),
  };
}

export function predictAll(
  observations: SKUObservations[],
  priors: ModelPriors = DEFAULT_PRIORS,
  now: Date = new Date(),
): Prediction[] {
  return observations.map((o) => predictSKU(o, priors, now));
}

function computeDampening(
  foodOrderDates: Date[],
  lastPurchase: Date,
  priors: ModelPriors,
): number {
  const windowStart =
    lastPurchase.getTime() - priors.dampeningWindowDays * DAY_MS;
  const inWindow = foodOrderDates.filter(
    (d) =>
      d.getTime() >= windowStart && d.getTime() <= lastPurchase.getTime(),
  ).length;
  return inWindow * priors.dampeningPerFoodOrder;
}

function stdDev(xs: number[]): number {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance =
    xs.reduce((s, x) => s + (x - mean) * (x - mean), 0) / xs.length;
  return Math.sqrt(variance);
}

function scoreConfidence(
  n: number,
  intervalStdDevDays: number | null,
): Confidence {
  if (n < 2) return "insufficient";
  if (n === 2) return "low";
  if (intervalStdDevDays !== null && intervalStdDevDays > 5) return "low";
  if (n <= 4) return "medium";
  return "high";
}
