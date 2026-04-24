import type { Context } from "@netlify/functions";

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return Response.json(
      { ok: false, error: "missing_code" },
      { status: 400 },
    );
  }

  return Response.json({ ok: true, received: true, state });
};

export const config = {
  path: "/auth/swiggy/callback",
};
