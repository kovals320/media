import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { requireMember } from "@/lib/auth";
import { signPaths } from "@/lib/photos";
import { AlbumView, type PhotoView } from "./AlbumView";

type Album = { id: string; title: string; created_by: string | null };
type Photo = {
  id: string;
  path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
};

export async function generateMetadata({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const { supabase } = await requireMember();
  const { data } = await supabase.from("media_albums").select("title").eq("id", albumId).maybeSingle();
  return { title: `${data?.title ?? "אלבום"} – המדיה של המשפחה` };
}

export default async function AlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(albumId)) notFound();

  const { supabase, user, member } = await requireMember();
  const isAdmin = member.role === "admin";

  const [{ data: album }, { data: photoRows }] = await Promise.all([
    supabase.from("media_albums").select("id, title, created_by").eq("id", albumId).maybeSingle(),
    supabase
      .from("media_photos")
      .select("id, path, thumb_path, width, height, uploaded_by")
      .eq("album_id", albumId)
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!album) notFound();

  const photos = (photoRows ?? []) as Photo[];
  const urls = await signPaths(supabase, photos.flatMap((p) => [p.thumb_path, p.path]));

  const views: PhotoView[] = photos
    .map((p) => ({
      id: p.id,
      thumb: urls.get(p.thumb_path) ?? "",
      full: urls.get(p.path) ?? "",
      width: p.width,
      height: p.height,
      canDelete: isAdmin || p.uploaded_by === user.id,
    }))
    .filter((p) => p.thumb && p.full);

  const a = album as Album;
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink href="/photos" label="לכל האלבומים" />
      <AlbumView
        albumId={a.id}
        title={a.title}
        canManage={isAdmin || a.created_by === user.id}
        photos={views}
      />
    </main>
  );
}
