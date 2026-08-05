import { NextRequest, NextResponse } from "next/server";

// Same mixed-content bypass as api/transcribe/route.ts -- the backend ALB is
// plain HTTP, so this server-side route relays the browser's JSON request to
// it over HTTPS on our own origin.
const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://fretwork-backend-alb-1519042531.us-east-1.elb.amazonaws.com";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const targetUrl = `${BACKEND_BASE_URL}/transcribe/pinned`;
  try {
    const payload = await request.json();

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      console.warn(`[api/pinned] Upstream ${targetUrl} returned status ${upstream.status}`);
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    console.error(`[api/pinned] Failed to proxy request to ${targetUrl}:`, err);
    return NextResponse.json(
      { error: "Could not reach the pinned re-decode backend." },
      { status: 502 }
    );
  }
}
