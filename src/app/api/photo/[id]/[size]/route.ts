import { fetchPhotoImage } from "@/lib/immich";

// Serves photos through the app so the Immich key never reaches the browser.
// Each image is cached on Vercel's network for a year after the first view.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; size: string }> },
) {
  const { id, size } = await params;
  if (size !== "thumb" && size !== "full") return new Response("Not found", { status: 404 });

  const image = await fetchPhotoImage(id, size === "thumb" ? "thumbnail" : "preview");
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.body, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=604800, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
      "Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
