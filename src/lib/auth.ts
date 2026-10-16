import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type Member = {
  email: string;
  display_name: string | null;
  role: "admin" | "member";
};

export type Viewer = {
  supabase: SupabaseClient;
  user: User | null;
  member: Member | null;
  isAdmin: boolean;
};

// The app is public and read-only. Signing in only matters for admins,
// who can add and change photos, albums and playlists.
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null, isAdmin: false };

  const { data } = await supabase
    .from("media_members")
    .select("email, display_name, role")
    .eq("email", (user.email ?? "").toLowerCase())
    .maybeSingle();
  const member = (data as Member | null) ?? null;

  return { supabase, user, member, isAdmin: member?.role === "admin" };
});

export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login");
  if (!viewer.isAdmin || !viewer.member) redirect("/");
  return viewer as Viewer & { user: User; member: Member };
}
