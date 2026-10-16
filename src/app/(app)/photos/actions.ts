"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { PHOTO_BUCKET } from "@/lib/photos";

export async function createAlbum(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const { supabase } = await requireMember();
  const { data, error } = await supabase
    .from("media_albums")
    .insert({ title })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not create album");
  revalidatePath("/photos");
  redirect(`/photos/${data.id}`);
}

export async function renameAlbum(albumId: string, title: string) {
  const clean = title.trim();
  if (!clean) return { error: "השם לא יכול להיות ריק." };
  const { supabase } = await requireMember();
  const { error, count } = await supabase
    .from("media_albums")
    .update({ title: clean }, { count: "exact" })
    .eq("id", albumId);
  if (error || count === 0) return { error: "רק מי שיצר את האלבום או מנהל יכולים לשנות את השם." };
  revalidatePath("/photos");
  revalidatePath(`/photos/${albumId}`);
  return { error: null };
}

export async function deleteAlbum(albumId: string) {
  const { supabase } = await requireMember();
  const { data: photos } = await supabase
    .from("media_photos")
    .select("path, thumb_path")
    .eq("album_id", albumId);
  const files = (photos ?? []).flatMap((p: { path: string; thumb_path: string }) => [p.path, p.thumb_path]);

  const { error, count } = await supabase
    .from("media_albums")
    .delete({ count: "exact" })
    .eq("id", albumId);
  if (error || count === 0) return { error: "רק מי שיצר את האלבום או מנהל יכולים למחוק אותו." };

  for (let i = 0; i < files.length; i += 100) {
    await supabase.storage.from(PHOTO_BUCKET).remove(files.slice(i, i + 100));
  }
  revalidatePath("/photos");
  redirect("/photos");
}

export async function deletePhoto(photoId: string) {
  const { supabase } = await requireMember();
  const { data: photo } = await supabase
    .from("media_photos")
    .select("album_id, path, thumb_path")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return { error: "התמונה כבר לא קיימת." };

  const { error, count } = await supabase
    .from("media_photos")
    .delete({ count: "exact" })
    .eq("id", photoId);
  if (error || count === 0) return { error: "רק מי שהעלה את התמונה או מנהל יכולים למחוק אותה." };

  await supabase.storage.from(PHOTO_BUCKET).remove([photo.path, photo.thumb_path]);
  revalidatePath("/photos");
  revalidatePath(`/photos/${photo.album_id}`);
  return { error: null };
}
