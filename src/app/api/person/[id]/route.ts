import { fetchPersonThumbnail } from "@/lib/immich";

// A person's face picture from Immich, served through the app (key stays on the server).
// Returns 404 if the key lacks person.read; the page then shows one of their photos instead.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await fetchPersonThumbnail(id);
  if (!image) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
  return new Response(image.body, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=86400",
      "CDN-Cache-Control": "public, max-age=604800",
      "Vercel-CDN-Cache-Control": "public, max-age=604800",
    },
  });
}
