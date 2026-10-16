import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple check that the app can reach Supabase with its configured keys.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Supabase environment variables are missing" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    return NextResponse.json(
      { ok: res.ok, supabase: res.ok ? "connected" : `status ${res.status}` },
      { status: res.ok ? 200 : 502 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach Supabase" },
      { status: 502 },
    );
  }
}
