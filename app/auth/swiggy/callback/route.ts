import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "missing_code" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, received: true, state });
}
