import type {
  OutboundButtonsMessage,
  OutboundTextMessage,
  SendResult,
} from "./types";

const GRAPH_BASE = "https://graph.facebook.com/v17.0";

export async function sendText(msg: OutboundTextMessage): Promise<SendResult> {
  if (isMock()) {
    console.log("[whatsapp:mock] sendText", msg);
    return { ok: true, messageId: `mock-${Date.now()}` };
  }
  return postGraph({
    messaging_product: "whatsapp",
    to: msg.to,
    type: "text",
    text: { body: msg.body },
  });
}

export async function sendButtons(
  msg: OutboundButtonsMessage,
): Promise<SendResult> {
  if (msg.buttons.length < 1 || msg.buttons.length > 3) {
    return {
      ok: false,
      error: "WhatsApp interactive buttons require 1–3 options",
    };
  }
  if (isMock()) {
    console.log("[whatsapp:mock] sendButtons", msg);
    return { ok: true, messageId: `mock-${Date.now()}` };
  }
  return postGraph({
    messaging_product: "whatsapp",
    to: msg.to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: msg.body },
      action: {
        buttons: msg.buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

function isMock(): boolean {
  return process.env.WHATSAPP_USE_MOCK === "1";
}

async function postGraph(body: Record<string, unknown>): Promise<SendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    return {
      ok: false,
      error:
        "missing_env: WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN",
    };
  }
  const r = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    return {
      ok: false,
      error: `graph_${r.status}: ${text.slice(0, 240)}`,
    };
  }
  const json = (await r.json()) as { messages?: Array<{ id: string }> };
  return { ok: true, messageId: json.messages?.[0]?.id };
}
