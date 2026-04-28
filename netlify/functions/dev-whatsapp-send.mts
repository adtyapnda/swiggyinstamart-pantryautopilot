import type { Context } from "@netlify/functions";
import { sendButtons, sendText } from "../lib/whatsapp/send";

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const to = url.searchParams.get("to");
  const text =
    url.searchParams.get("text") ?? "Pantry Autopilot dev test message";
  const mode = url.searchParams.get("mode") ?? "text";

  if (!to) {
    return Response.json(
      { ok: false, error: "missing 'to' query param (phone number with country code)" },
      { status: 400 },
    );
  }

  if (mode === "buttons") {
    const result = await sendButtons({
      to,
      body: text,
      buttons: [
        { id: "reorder", title: "Reorder" },
        { id: "have_it", title: "Already got it" },
        { id: "skip", title: "Skip" },
      ],
    });
    return Response.json(result);
  }

  const result = await sendText({ to, body: text });
  return Response.json(result);
};

export const config = {
  path: "/dev/whatsapp-send",
};
