import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Test playlist used to confirm the YouTube API key works.
const TEST_PLAYLIST_ID = "PLi6UeUKLrBdhnVXQNU2q7LbdjfCEqgPv1";

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return "missing environment variables";
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    return res.ok ? "connected" : `status ${res.status}`;
  } catch {
    return "unreachable";
  }
}

async function checkYouTube() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { status: "missing YOUTUBE_API_KEY" };
  try {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      id: TEST_PLAYLIST_ID,
      key,
    });
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?${params}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok) {
      return { status: `error ${res.status}`, reason: data?.error?.message };
    }
    const playlist = data.items?.[0];
    if (!playlist) return { status: "connected, but test playlist not found" };
    return { status: "connected" };
  } catch {
    return { status: "unreachable" };
  }
}

async function checkImmich() {
  const base = process.env.IMMICH_URL?.replace(/\/$/, "");
  const key = process.env.IMMICH_API_KEY;
  if (!base || !key) return "missing IMMICH_URL / IMMICH_API_KEY";
  try {
    const res = await fetch(`${base}/api/libraries`, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    return res.ok ? "connected" : `status ${res.status}`;
  } catch {
    return "unreachable";
  }
}

// The optional write key used to save approved face names (not required for the app to work).
async function checkTagging() {
  const base = process.env.IMMICH_URL?.replace(/\/$/, "");
  const key = process.env.IMMICH_TAG_API_KEY;
  if (!key) return "not set up";
  try {
    const res = await fetch(`${base}/api/people?size=1`, { headers: { "x-api-key": key }, cache: "no-store" });
    return res.ok ? "connected" : `status ${res.status}`;
  } catch {
    return "unreachable";
  }
}

export async function GET() {
  const [supabase, youtube, immich, tagging] = await Promise.all([
    checkSupabase(),
    checkYouTube(),
    checkImmich(),
    checkTagging(),
  ]);
  const ok = supabase === "connected" && youtube.status === "connected" && immich === "connected";
  return NextResponse.json({ ok, supabase, youtube, immich, tagging }, { status: ok ? 200 : 502 });
}
