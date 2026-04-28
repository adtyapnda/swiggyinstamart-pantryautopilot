export interface InstamartOrderItem {
  productId: string;
  name: string;
  quantity: number;
  variant?: string;
  price?: number;
}

export interface InstamartOrder {
  orderId: string;
  placedAt: string;
  items: InstamartOrderItem[];
  totalAmount?: number;
  status?: string;
  raw?: unknown;
}

export interface InstamartProductVariant {
  variantId: string;
  packSize?: string;
  price?: number;
  inStock?: boolean;
}

export interface InstamartProduct {
  productId: string;
  name: string;
  variants?: InstamartProductVariant[];
  raw?: unknown;
}

export interface InstamartCart {
  items: InstamartOrderItem[];
  totalAmount?: number;
  raw?: unknown;
}

export interface FoodOrder {
  orderId: string;
  placedAt?: string;
  restaurantName?: string;
  status?: string;
  raw?: unknown;
}
