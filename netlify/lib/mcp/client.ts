import type {
  FoodOrder,
  InstamartCart,
  InstamartOrder,
  InstamartProduct,
} from "./types";

export interface UpdateCartArgs {
  items: Array<{ productId: string; quantity: number }>;
}

export interface SearchProductsArgs {
  addressId: string;
  query: string;
}

export interface MCPClient {
  connect(): Promise<void>;
  close(): Promise<void>;

  callTool(
    name: string,
    args?: Record<string, unknown>,
    server?: "instamart" | "food",
  ): Promise<unknown>;

  getInstamartOrders(): Promise<InstamartOrder[]>;
  searchInstamartProducts(args: SearchProductsArgs): Promise<InstamartProduct[]>;
  getInstamartCart(): Promise<InstamartCart>;
  updateInstamartCart(args: UpdateCartArgs): Promise<InstamartCart>;
  clearInstamartCart(): Promise<void>;

  getFoodOrders(): Promise<FoodOrder[]>;
}
