import type { Purchase, SKUObservations } from "./types";

const DAY_MS = 86_400_000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function expSample(rng: () => number, mean: number): number {
  return -mean * Math.log(1 - rng());
}

export interface SyntheticSKU {
  sku: string;
  name: string;
  trueCadenceDays: number;
  jitter: number;
  quantityPerPurchase: number;
}

export interface SyntheticConfig {
  seed: number;
  now: Date;
  historyDays: number;
  skus: SyntheticSKU[];
  foodOrdersPerWeek: number;
}

export const DEFAULT_SKUS: SyntheticSKU[] = [
  { sku: "milk-1l", name: "Milk", trueCadenceDays: 3, jitter: 0.4, quantityPerPurchase: 2 },
  { sku: "bread-400g", name: "Bread", trueCadenceDays: 5, jitter: 0.3, quantityPerPurchase: 1 },
  { sku: "eggs-12", name: "Eggs", trueCadenceDays: 7, jitter: 0.4, quantityPerPurchase: 1 },
  { sku: "atta-5kg", name: "Atta (Whole-wheat flour)", trueCadenceDays: 21, jitter: 0.2, quantityPerPurchase: 1 },
  { sku: "rice-5kg", name: "Rice", trueCadenceDays: 30, jitter: 0.2, quantityPerPurchase: 1 },
];

export function generateSyntheticHistory(
  config: SyntheticConfig,
): { observations: SKUObservations[]; foodOrderDates: Date[] } {
  const rng = mulberry32(config.seed);
  const startMs = config.now.getTime() - config.historyDays * DAY_MS;

  const foodOrderDates: Date[] = [];
  const foodMean = 7 / Math.max(config.foodOrdersPerWeek, 0.01);
  let foodCursor = startMs + expSample(rng, foodMean) * DAY_MS;
  while (foodCursor <= config.now.getTime()) {
    foodOrderDates.push(new Date(foodCursor));
    foodCursor += expSample(rng, foodMean) * DAY_MS;
  }

  const observations: SKUObservations[] = config.skus.map((s) => {
    const purchases: Purchase[] = [];
    let cursor =
      startMs + s.trueCadenceDays * (0.3 + 0.4 * rng()) * DAY_MS;
    while (cursor <= config.now.getTime()) {
      purchases.push({
        date: new Date(cursor),
        quantity: s.quantityPerPurchase,
      });
      const jitterFactor = 1 + (rng() * 2 - 1) * s.jitter;
      cursor += s.trueCadenceDays * Math.max(jitterFactor, 0.1) * DAY_MS;
    }
    return {
      sku: s.sku,
      name: s.name,
      purchases,
      foodOrderDates,
    };
  });

  return { observations, foodOrderDates };
}
