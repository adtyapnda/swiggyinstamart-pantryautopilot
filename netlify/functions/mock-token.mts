import type { Context } from "@netlify/functions";
import { randomBytes } from "node:crypto";
import { computeChallenge } from "../lib/oauth";
import { takeMockSession } from "../lib/storage";

interface TokenRequestBody {
  grant_type?: string;
  code?: string;
  code_verifier?: string;
  client_id?: string;
  redirect_uri?: string;
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  let body: TokenRequestBody;
  try {
    body = (await request.json()) as TokenRequestBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { grant_type, code, code_verifier, client_id, redirect_uri } = body;

  if (grant_type !== "authorization_code") {
    return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  }
  if (!code || !code_verifier || !client_id || !redirect_uri) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const session = await takeMockSession(code);
  if (!session) {
    return Response.json(
      { error: "invalid_grant", reason: "code not found or expired" },
      { status: 400 },
    );
  }
  if (session.client_id !== client_id) {
    return Response.json({ error: "invalid_client" }, { status: 400 });
  }
  if (session.redirect_uri !== redirect_uri) {
    return Response.json(
      { error: "invalid_grant", reason: "redirect_uri mismatch" },
      { status: 400 },
    );
  }

  const computed = computeChallenge(code_verifier);
  if (computed !== session.challenge) {
    return Response.json(
      { error: "invalid_grant", reason: "PKCE verification failed" },
      { status: 400 },
    );
  }

  const access_token = `mock_${randomBytes(24).toString("base64url")}`;

  return Response.json({
    access_token,
    token_type: "Bearer",
    expires_in: 432000,
    scope: "mcp:tools mcp:resources mcp:prompts",
  });
};

export const config = {
  path: "/mock/token",
};
