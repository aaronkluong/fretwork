import { NextRequest, NextResponse } from "next/server";

// The real backend lives on a plain-HTTP ALB. Browsers on our HTTPS frontend
// (Cloudflare Pages) refuse to call an http:// endpoint directly — that's
// "mixed content" and gets silently blocked. This route runs server-side
// (no browser involved), so it can freely talk to the http backend and relay
// the response back to the browser over our own HTTPS origin.
//
// Falls back to NEXT_PUBLIC_API_URL if a server-only override isn't set, but
// prefer setting BACKEND_API_URL so this can point somewhere different than
// the value baked into client bundles if needed.
const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://fretwork-backend-alb-1519042531.us-east-1.elb.amazonaws.com";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const upstream = await fetch(`${BACKEND_BASE_URL}/transcribe`, {
      method: "POST",
      body: formData,
    });

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach the transcription backend." },
      { status: 502 }
    );
  }
}
