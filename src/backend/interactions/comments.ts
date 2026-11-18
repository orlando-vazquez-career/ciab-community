import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ForumComment = {
  id: string;
  parentId: string | null;
  body: string;
  status: "published" | "hidden" | "deleted";
  createdAt: string;
  authorName: string;
  authorUsername: string | null;
};

type Embedded<T> = T | T[] | null | undefined;
type RawProfile = { display_name: string; username: string };
type RawComment = {
  id: string;
  parent_id: string | null;
  body: string;
  status: ForumComment["status"];
  created_at: string;
  profiles?: Embedded<RawProfile>;
};

function one<T>(value: Embedded<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function listPostComments(
  supabase: SupabaseClient,
  postId: string,
): Promise<ForumComment[] | null> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, parent_id, body, status, created_at, profiles(display_name, username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) return null;
  return ((data ?? []) as unknown as RawComment[]).map((row) => {
    const profile = one(row.profiles);
    return {
      id: row.id,
      parentId: row.parent_id,
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      authorName: profile?.display_name || "Miembro de la comunidad",
      authorUsername: profile?.username ?? null,
    };
  });
}
