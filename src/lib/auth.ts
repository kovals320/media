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

export type Session = {
  supabase: SupabaseClient;
  user: User | null;
  member: Member | null;
};

// One lookup per request, shared by layouts, pages and actions.
export const getSession = cache(async (): Promise<Session> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null };

  const { data } = await supabase
    .from("media_members")
    .select("email, display_name, role")
    .eq("email", (user.email ?? "").toLowerCase())
    .maybeSingle();

  return { supabase, user, member: (data as Member | null) ?? null };
});

export async function requireMember() {
  const session = await getSession();
  if (!session.user) redirect("/login");
  if (!session.member) redirect("/no-access");
  return session as { supabase: SupabaseClient; user: User; member: Member };
}

export async function requireAdmin() {
  const session = await requireMember();
  if (session.member.role !== "admin") redirect("/");
  return session;
}
