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
    return {
      status: "connected",
      testPlaylist: playlist.snippet?.title,
      videos: playlist.contentDetails?.itemCount,
    };
  } catch {
    return { status: "unreachable" };
  }
}

export async function GET() {
  const [supabase, youtube] = await Promise.all([checkSupabase(), checkYouTube()]);
  const ok = supabase === "connected" && youtube.status === "connected";
  return NextResponse.json({ ok, supabase, youtube }, { status: ok ? 200 : 502 });
}
