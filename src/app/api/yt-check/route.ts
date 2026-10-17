import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// TEMPORARY: where is the gap between the channel and the app?
const API = "https://www.googleapis.com/youtube/v3";
async function yt<T>(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY! });
  const r = await fetch(`${API}/${path}?${qs}`, { cache: "no-store" });
  return (await r.json()) as T;
}
type Items = {
  nextPageToken?: string;
  items: { snippet: { title: string; channelId?: string; videoOwnerChannelId?: string; resourceId: { videoId: string } }; status?: { privacyStatus?: string } }[];
};
async function allItems(playlistId: string) {
  const out: Items["items"] = [];
  let pageToken: string | undefined;
  do {
    const page = await yt<Items>("playlistItems", { part: "snippet,status", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    out.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("media_playlists").select("youtube_playlist_id, title");
  const playlists = (data ?? []) as { youtube_playlist_id: string; title: string }[];

  const inApp = new Set<string>();
  const perPlaylist = [];
  let channelId: string | undefined;
  for (const p of playlists) {
    const items = await allItems(p.youtube_playlist_id);
    const statuses: Record<string, number> = {};
    for (const it of items) {
      const s = it.status?.privacyStatus ?? "?";
      statuses[s] = (statuses[s] ?? 0) + 1;
      if (s !== "private" && s !== "privacyStatusUnspecified") inApp.add(it.snippet.resourceId.videoId);
      channelId ??= it.snippet.channelId;
    }
    perPlaylist.push({ title: p.title, items: items.length, statuses });
  }

  const ch = await yt<{ items: { contentDetails: { relatedPlaylists: { uploads: string } }; statistics: { videoCount: string } }[] }>(
    "channels",
    { part: "contentDetails,statistics", id: channelId ?? "" },
  );
  const uploadsId = ch.items?.[0]?.contentDetails.relatedPlaylists.uploads;
  const uploads = uploadsId ? await allItems(uploadsId) : [];
  const notInApp = uploads.filter((u) => !inApp.has(u.snippet.resourceId.videoId));

  return NextResponse.json({
    channelVideoCountPublic: ch.items?.[0]?.statistics.videoCount,
    perPlaylist,
    uniqueShownInApp: inApp.size,
    uploadsVisibleToApp: uploads.length,
    channelVideosNotInAnyAppPlaylist: notInApp.map((u) => `${u.status?.privacyStatus} | ${u.snippet.title}`),
  });
}
