import type { Context } from "@netlify/functions";
import { putToken, takeSession } from "../lib/storage";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const authorizeError = url.searchParams.get("error");

  if (authorizeError) {
    return Response.json(
      { ok: false, error: "authorize_failed", reason: authorizeError },
      { status: 400 },
    );
  }
  if (!code) {
    return Response.json({ ok: false, error: "missing_code" }, { status: 400 });
  }
  if (!state) {
    return Response.json({ ok: false, error: "missing_state" }, { status: 400 });
  }

  const session = await takeSession(state);
  if (!session) {
    return Response.json(
      { ok: false, error: "invalid_or_expired_state" },
      { status: 400 },
    );
  }

  const tokenUrl = process.env.SWIGGY_TOKEN_URL;
  const clientId = process.env.SWIGGY_CLIENT_ID;
  const redirectUri = process.env.SWIGGY_REDIRECT_URI;

  if (!tokenUrl || !clientId || !redirectUri) {
    return Response.json({ ok: false, error: "missing_env" }, { status: 500 });
  }

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      code_verifier: session.verifier,
      client_id: clientId,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return Response.json(
      {
        ok: false,
        error: "token_exchange_failed",
        status: tokenResponse.status,
        body: text,
      },
      { status: 502 },
    );
  }

  const tokenJson = (await tokenResponse.json()) as TokenResponse;

  await putToken({ ...tokenJson, acquired_at: Date.now() });

  const masked = `${tokenJson.access_token.slice(0, 8)}…${tokenJson.access_token.slice(-4)}`;
  const expiryDate = new Date(
    Date.now() + tokenJson.expires_in * 1000,
  ).toISOString();

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Connected — Pantry Autopilot</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 520px; margin: 4rem auto; padding: 0 1rem; line-height: 1.55; color: #1a1a1a; background: #fafaf7;">
<h1 style="margin-bottom: 0.25rem;">Connected to Swiggy</h1>
<p style="color:#666; margin-top: 0;">Access token acquired and stored.</p>
<dl style="margin-top: 2rem;">
<dt style="color:#888;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em;">Token</dt>
<dd style="margin: 0 0 1rem 0;"><code>${masked}</code></dd>
<dt style="color:#888;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em;">Scope</dt>
<dd style="margin: 0 0 1rem 0;"><code>${tokenJson.scope}</code></dd>
<dt style="color:#888;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em;">Expires</dt>
<dd style="margin: 0;"><code>${expiryDate}</code></dd>
</dl>
<p style="color:#888; font-size:0.9rem; margin-top: 2.5rem;">Stored under dev key. WhatsApp identity binding is the next milestone.</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};

export const config = {
  path: "/auth/swiggy/callback",
};
