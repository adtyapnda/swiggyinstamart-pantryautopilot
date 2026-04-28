import { getToken } from "../storage";
import type { MCPClient } from "./client";
import { FakeMCPClient } from "./fake";
import { RealMCPClient } from "./real";

export interface MCPClientOptions {
  useFake?: boolean;
  token?: string;
}

export async function createMCPClient(
  options: MCPClientOptions = {},
): Promise<MCPClient> {
  if (options.useFake || process.env.MCP_USE_FAKE === "1") {
    return new FakeMCPClient();
  }
  let token = options.token;
  if (!token) {
    const record = await getToken();
    if (!record) {
      throw new Error(
        "No access token stored — run /auth/swiggy/start first or set MCP_USE_FAKE=1",
      );
    }
    token = record.access_token;
  }
  return new RealMCPClient(token);
}

export async function withMCPClient<T>(
  options: MCPClientOptions,
  fn: (client: MCPClient) => Promise<T>,
): Promise<T> {
  const client = await createMCPClient(options);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export type {
  MCPClient,
  SearchProductsArgs,
  UpdateCartArgs,
} from "./client";
export type {
  FoodOrder,
  InstamartCart,
  InstamartOrder,
  InstamartOrderItem,
  InstamartProduct,
  InstamartProductVariant,
} from "./types";
