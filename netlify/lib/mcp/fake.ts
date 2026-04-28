import type {
  MCPClient,
  SearchProductsArgs,
  UpdateCartArgs,
} from "./client";
import type {
  FoodOrder,
  InstamartCart,
  InstamartOrder,
  InstamartProduct,
} from "./types";

const DAY_MS = 86_400_000;

export class FakeMCPClient implements MCPClient {
  async connect(): Promise<void> {}
  async close(): Promise<void> {}

  async callTool(
    name: string,
    args: Record<string, unknown> = {},
    _server?: "instamart" | "food",
  ): Promise<unknown> {
    switch (name) {
      case "get_orders":
        return this.getInstamartOrders();
      case "search_products":
        return this.searchInstamartProducts({
          addressId: (args.addressId as string) ?? "fake-addr",
          query: (args.query as string) ?? "",
        });
      case "get_cart":
        return this.getInstamartCart();
      case "update_cart":
        return this.updateInstamartCart({
          items: (args.items as UpdateCartArgs["items"]) ?? [],
        });
      case "clear_cart":
        return null;
      case "get_food_orders":
        return this.getFoodOrders();
      default:
        return null;
    }
  }

  async getInstamartOrders(): Promise<InstamartOrder[]> {
    const now = Date.now();
    return [
      {
        orderId: "fake-im-001",
        placedAt: new Date(now - 7 * DAY_MS).toISOString(),
        items: [
          { productId: "milk-1l", name: "Milk", quantity: 2, variant: "1L", price: 70 },
          { productId: "bread-400g", name: "Bread", quantity: 1, variant: "400g", price: 45 },
        ],
        totalAmount: 185,
        status: "delivered",
      },
      {
        orderId: "fake-im-002",
        placedAt: new Date(now - 3 * DAY_MS).toISOString(),
        items: [
          { productId: "milk-1l", name: "Milk", quantity: 2, variant: "1L", price: 70 },
          { productId: "eggs-12", name: "Eggs", quantity: 1, variant: "12 pieces", price: 90 },
        ],
        totalAmount: 230,
        status: "delivered",
      },
    ];
  }

  async searchInstamartProducts(
    args: SearchProductsArgs,
  ): Promise<InstamartProduct[]> {
    return [
      {
        productId: "milk-1l",
        name: `Mock product for "${args.query}"`,
        variants: [
          { variantId: "milk-1l-v1", packSize: "1L", price: 70, inStock: true },
        ],
      },
    ];
  }

  async getInstamartCart(): Promise<InstamartCart> {
    return { items: [], totalAmount: 0 };
  }

  async updateInstamartCart(args: UpdateCartArgs): Promise<InstamartCart> {
    return {
      items: args.items.map((it) => ({
        productId: it.productId,
        name: `Mock ${it.productId}`,
        quantity: it.quantity,
        price: 50,
      })),
      totalAmount: args.items.reduce((s, it) => s + it.quantity * 50, 0),
    };
  }

  async clearInstamartCart(): Promise<void> {}

  async getFoodOrders(): Promise<FoodOrder[]> {
    const now = Date.now();
    return [
      {
        orderId: "fake-food-001",
        placedAt: new Date(now - 2 * DAY_MS).toISOString(),
        restaurantName: "Mock Biryani House",
        status: "delivered",
      },
    ];
  }
}
