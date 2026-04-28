import type { Context } from "@netlify/functions";
import { computeChallenge, generateState, generateVerifier } from "../lib/oauth";
import { putSession } from "../lib/storage";

export default async (_request: Request, _context: Context) => {
  const authorizeUrl = process.env.SWIGGY_AUTHORIZE_URL;
  const clientId = process.env.SWIGGY_CLIENT_ID;
  const redirectUri = process.env.SWIGGY_REDIRECT_URI;

  if (!authorizeUrl || !clientId || !redirectUri) {
    const missing = (
      ["SWIGGY_AUTHORIZE_URL", "SWIGGY_CLIENT_ID", "SWIGGY_REDIRECT_URI"] as const
    ).filter((k) => !process.env[k]);
    return Response.json(
      { ok: false, error: "missing_env", missing },
      { status: 500 },
    );
  }

  const verifier = generateVerifier();
  const challenge = computeChallenge(verifier);
  const state = generateState();

  await putSession(state, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    scope: "mcp:tools",
  });

  return Response.redirect(`${authorizeUrl}?${params.toString()}`, 302);
};

export const config = {
  path: "/auth/swiggy/start",
};
