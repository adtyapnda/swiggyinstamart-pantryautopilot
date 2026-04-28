import type { IncomingMessage } from "./types";

interface RawMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
}

interface MessageEnvelope {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: { messages?: RawMessage[] };
    }>;
  }>;
}

export function parseWebhookPayload(payload: unknown): IncomingMessage[] {
  const env = payload as MessageEnvelope;
  const out: IncomingMessage[] = [];
  for (const e of env.entry ?? []) {
    for (const c of e.changes ?? []) {
      for (const m of c.value?.messages ?? []) {
        out.push(toIncoming(m));
      }
    }
  }
  return out;
}

function toIncoming(m: RawMessage): IncomingMessage {
  const timestamp = new Date(Number(m.timestamp) * 1000);
  if (m.type === "text") {
    return {
      from: m.from,
      messageId: m.id,
      timestamp,
      type: "text",
      text: m.text?.body,
      raw: m,
    };
  }
  if (m.type === "interactive" && m.interactive?.type === "button_reply") {
    return {
      from: m.from,
      messageId: m.id,
      timestamp,
      type: "button_reply",
      buttonId: m.interactive.button_reply?.id,
      text: m.interactive.button_reply?.title,
      raw: m,
    };
  }
  return {
    from: m.from,
    messageId: m.id,
    timestamp,
    type: "other",
    raw: m,
  };
}
