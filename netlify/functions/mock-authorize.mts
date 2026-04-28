import type { Context } from "@netlify/functions";
import { generateState } from "../lib/oauth";
import { putMockSession } from "../lib/storage";

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const state = url.searchParams.get("state");

  if (responseType !== "code") {
    return Response.json(
      { error: "unsupported_response_type" },
      { status: 400 },
    );
  }
  if (!clientId || !redirectUri || !codeChallenge || !state) {
    return Response.json(
      {
        error: "invalid_request",
        missing: {
          client_id: !clientId,
          redirect_uri: !redirectUri,
          code_challenge: !codeChallenge,
          state: !state,
        },
      },
      { status: 400 },
    );
  }
  if (codeChallengeMethod !== "S256") {
    return Response.json(
      { error: "unsupported_code_challenge_method" },
      { status: 400 },
    );
  }

  const code = generateState();
  await putMockSession(code, {
    challenge: codeChallenge,
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  const back = new URL(redirectUri);
  back.searchParams.set("code", code);
  back.searchParams.set("state", state);

  return Response.redirect(back.toString(), 302);
};

export const config = {
  path: "/mock/authorize",
};
