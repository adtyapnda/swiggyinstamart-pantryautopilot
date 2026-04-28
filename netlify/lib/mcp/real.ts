import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
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

const DEFAULT_BASE_URL = "https://mcp.swiggy.com";

export type Server = "instamart" | "food";

const FOOD_TOOLS = new Set([
  "get_addresses",
  "search_restaurants",
  "search_menu",
  "get_restaurant_menu",
  "get_food_cart",
  "update_food_cart",
  "flush_food_cart",
  "fetch_food_coupons",
  "apply_food_coupon",
  "place_food_order",
  "get_food_orders",
  "get_food_order_details",
  "track_food_order",
  "report_error",
]);

interface ServerSlot {
  client: Client;
  transport: StreamableHTTPClientTransport | null;
  url: URL;
}

export class RealMCPClient implements MCPClient {
  private readonly slots: Record<Server, ServerSlot>;
  private connected = false;

  constructor(
    private readonly token: string,
    baseUrl: string = process.env.SWIGGY_MCP_BASE_URL ?? DEFAULT_BASE_URL,
  ) {
    this.slots = {
      instamart: {
        client: new Client({ name: "pantry-autopilot", version: "0.1.0" }),
        transport: null,
        url: new URL(`${baseUrl}/instamart`),
      },
      food: {
        client: new Client({ name: "pantry-autopilot", version: "0.1.0" }),
        transport: null,
        url: new URL(`${baseUrl}/food`),
      },
    };
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await Promise.all([
      this.connectSlot(this.slots.instamart),
      this.connectSlot(this.slots.food),
    ]);
    this.connected = true;
  }

  private async connectSlot(slot: ServerSlot): Promise<void> {
    slot.transport = new StreamableHTTPClientTransport(slot.url, {
      requestInit: {
        headers: { Authorization: `Bearer ${this.token}` },
      },
    });
    await slot.client.connect(slot.transport);
  }

  async close(): Promise<void> {
    if (!this.connected) return;
    await Promise.all([
      this.slots.instamart.client.close(),
      this.slots.food.client.close(),
    ]);
    this.connected = false;
  }

  async callTool(
    name: string,
    args: Record<string, unknown> = {},
    server?: Server,
  ): Promise<unknown> {
    if (!this.connected) {
      throw new Error("MCPClient not connected — call connect() first");
    }
    const target = server ?? this.serverForTool(name);
    const result = await this.slots[target].client.callTool({
      name,
      arguments: args,
    });
    return parseToolResult(result);
  }

  private serverForTool(name: string): Server {
    return FOOD_TOOLS.has(name) ? "food" : "instamart";
  }

  async getInstamartOrders(): Promise<InstamartOrder[]> {
    const raw = await this.callTool("get_orders", {}, "instamart");
    return Array.isArray(raw) ? (raw as InstamartOrder[]) : [];
  }

  async searchInstamartProducts(
    args: SearchProductsArgs,
  ): Promise<InstamartProduct[]> {
    const raw = await this.callTool(
      "search_products",
      args as unknown as Record<string, unknown>,
      "instamart",
    );
    return Array.isArray(raw) ? (raw as InstamartProduct[]) : [];
  }

  async getInstamartCart(): Promise<InstamartCart> {
    const raw = await this.callTool("get_cart", {}, "instamart");
    return (raw ?? { items: [] }) as InstamartCart;
  }

  async updateInstamartCart(args: UpdateCartArgs): Promise<InstamartCart> {
    const raw = await this.callTool(
      "update_cart",
      args as unknown as Record<string, unknown>,
      "instamart",
    );
    return (raw ?? { items: [] }) as InstamartCart;
  }

  async clearInstamartCart(): Promise<void> {
    await this.callTool("clear_cart", {}, "instamart");
  }

  async getFoodOrders(): Promise<FoodOrder[]> {
    const raw = await this.callTool("get_food_orders", {}, "food");
    return Array.isArray(raw) ? (raw as FoodOrder[]) : [];
  }
}

function parseToolResult(result: unknown): unknown {
  if (result && typeof result === "object") {
    const r = result as { structuredContent?: unknown; content?: unknown };
    if (r.structuredContent !== undefined) return r.structuredContent;
    if (Array.isArray(r.content)) {
      const first = r.content[0] as
        | { type?: string; text?: string }
        | undefined;
      if (first?.type === "text" && typeof first.text === "string") {
        try {
          return JSON.parse(first.text);
        } catch {
          return first.text;
        }
      }
    }
  }
  return result;
}
