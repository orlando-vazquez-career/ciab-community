import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasUserVotedForPost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("post_votes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return Boolean(data);
}
