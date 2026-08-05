import { NextRequest, NextResponse } from "next/server";

// See src/app/api/transcribe/route.ts for why this proxy exists: it lets our
// HTTPS frontend reach the plain-HTTP backend without the browser blocking
// the request as mixed content.
const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://fretwork-backend-alb-1519042531.us-east-1.elb.amazonaws.com";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const upstream = await fetch(`${BACKEND_BASE_URL}/process-jams`, {
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
      { error: "Could not reach the JAMS-processing backend.", detail: String(err) },
      { status: 502 }
    );
  }
}
