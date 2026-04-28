import type { Context } from "@netlify/functions";
import { withMCPClient } from "../lib/mcp";

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const useFake =
    url.searchParams.get("fake") === "1" ||
    process.env.MCP_USE_FAKE === "1";

  try {
    const result = await withMCPClient({ useFake }, async (client) => {
      const [instamartOrders, foodOrders, cart] = await Promise.all([
        client
          .getInstamartOrders()
          .catch((e: unknown) => ({ error: String(e) })),
        client.getFoodOrders().catch((e: unknown) => ({ error: String(e) })),
        client
          .getInstamartCart()
          .catch((e: unknown) => ({ error: String(e) })),
      ]);
      return { instamartOrders, foodOrders, cart };
    });

    return Response.json({ ok: true, useFake, result });
  } catch (e: unknown) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};

export const config = {
  path: "/dev/mcp-ping",
};
