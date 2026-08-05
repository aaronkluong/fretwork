import { NextRequest, NextResponse } from "next/server";

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      console.warn(`[api/transcribe/pinned] Upstream ${targetUrl} returned status ${upstream.status}`);
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    console.error(`[api/transcribe/pinned] Failed to proxy request to ${targetUrl}:`, err);
    return NextResponse.json(
      { error: "Could not reach the pinned transcription backend.", targetUrl, detail: String(err) },
      { status: 502 }
    );
  }
}
