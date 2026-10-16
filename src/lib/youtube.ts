import "server-only";

// YouTube results are cached on Vercel for 30 minutes, so new videos
// added to a playlist show up in the app within half an hour.
const REVALIDATE_SECONDS = 1800;
const API = "https://www.googleapis.com/youtube/v3";

export type Video = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string | null;
  duration: string | null; // e.g. "4:07" or "1:02:15"
};

type Thumbs = Record<string, { url: string } | undefined>;

function apiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  return key;
}

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: apiKey() });
  const res = await fetch(`${API}/${path}?${qs}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`YouTube ${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

function bestThumb(t: Thumbs | undefined, id: string) {
  return (
    t?.maxres?.url ?? t?.standard?.url ?? t?.high?.url ?? t?.medium?.url ??
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  );
}

// ISO 8601 duration (PT1H2M15S) -> "1:02:15"
function formatDuration(iso: string | undefined) {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2] ?? 0), Number(m[3] ?? 0)];
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(min).padStart(2, "0")}:${ss}` : `${min}:${ss}`;
}

type PlaylistItemsResponse = {
  nextPageToken?: string;
  items: {
    snippet: { title: string; thumbnails?: Thumbs; resourceId: { videoId: string } };
    contentDetails?: { videoPublishedAt?: string };
    status?: { privacyStatus?: string };
  }[];
};

type VideosResponse = {
  items: { id: string; contentDetails?: { duration?: string } }[];
};

export async function getPlaylistVideos(playlistId: string): Promise<Video[]> {
  const videos: Video[] = [];
  let pageToken: string | undefined;

  do {
    const page = await yt<PlaylistItemsResponse>("playlistItems", {
      part: "snippet,contentDetails,status",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of page.items) {
      const privacy = item.status?.privacyStatus;
      if (privacy === "private" || privacy === "privacyStatusUnspecified") continue;
      const id = item.snippet.resourceId.videoId;
      videos.push({
        id,
        title: item.snippet.title,
        thumbnail: bestThumb(item.snippet.thumbnails, id),
        publishedAt: item.contentDetails?.videoPublishedAt ?? null,
        duration: null,
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  // Durations come from a separate endpoint, 50 ids per call.
  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    const res = await yt<VideosResponse>("videos", {
      part: "contentDetails",
      id: batch.map((v) => v.id).join(","),
    });
    const byId = new Map(res.items.map((v) => [v.id, v.contentDetails?.duration]));
    for (const v of batch) v.duration = formatDuration(byId.get(v.id));
  }

  return videos;
}
