export type IncomingMessageType = "text" | "button_reply" | "other";

export interface IncomingMessage {
  from: string;
  messageId: string;
  timestamp: Date;
  type: IncomingMessageType;
  text?: string;
  buttonId?: string;
  raw?: unknown;
}

export interface OutboundTextMessage {
  to: string;
  body: string;
}

export interface OutboundButtonsMessage {
  to: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}
