import type { Context } from "@netlify/functions";
import { parseWebhookPayload } from "../lib/whatsapp/parse";

export default async (request: Request, _context: Context) => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (
      mode === "subscribe" &&
      token &&
      expected &&
      token === expected &&
      challenge
    ) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("forbidden", { status: 403 });
  }
  if (request.method === "POST") {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "invalid_json" },
        { status: 400 },
      );
    }
    const messages = parseWebhookPayload(payload);
    for (const m of messages) {
      console.log("[whatsapp] received", {
        from: m.from,
        type: m.type,
        text: m.text,
        buttonId: m.buttonId,
      });
    }
    return Response.json({ ok: true, received: messages.length });
  }
  return new Response("method not allowed", { status: 405 });
};

export const config = {
  path: "/whatsapp/webhook",
};
