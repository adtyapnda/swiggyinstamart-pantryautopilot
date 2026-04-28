export interface Purchase {
  date: Date;
  quantity: number;
  variant?: string;
}

export interface SKUObservations {
  sku: string;
  name?: string;
  purchases: Purchase[];
  foodOrderDates?: Date[];
}

export type Confidence = "insufficient" | "low" | "medium" | "high";

export interface Prediction {
  sku: string;
  name?: string;
  nextNeedDate: Date | null;
  cadenceDays: number | null;
  baseCadenceDays: number | null;
  dampeningDays: number;
  observationCount: number;
  intervalStdDevDays: number | null;
  confidence: Confidence;
}

export interface ModelPriors {
  shape: number;
  rate: number;
  dampeningPerFoodOrder: number;
  dampeningWindowDays: number;
}

export const DEFAULT_PRIORS: ModelPriors = {
  shape: 2,
  rate: 7,
  dampeningPerFoodOrder: 0.3,
  dampeningWindowDays: 7,
};
