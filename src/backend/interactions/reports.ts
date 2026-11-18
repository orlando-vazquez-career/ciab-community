import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type OpenForumReport = {
  id: string;
  reason: string;
  createdAt: string;
  reporterName: string;
  targetType: "post" | "comment";
  targetId: string;
  targetText: string;
  targetStatus: string | null;
  postTitle: string | null;
  postSlug: string | null;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  created_at: string;
};
type ProfileRow = { user_id: string; display_name: string };
type PostRow = { id: string; title: string; slug: string };
type CommentRow = { id: string; post_id: string; body: string; status: string };

export async function listOpenForumReports(
  supabase: SupabaseClient,
): Promise<OpenForumReport[] | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, reporter_id, post_id, comment_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return null;

  const reports = (data ?? []) as ReportRow[];
  if (!reports.length) return [];

  const reporterIds = [...new Set(reports.map((report) => report.reporter_id))];
  const postIds = [...new Set(reports.flatMap((report) => report.post_id ? [report.post_id] : []))];
  const commentIds = [...new Set(reports.flatMap((report) => report.comment_id ? [report.comment_id] : []))];

  const [profileResult, postResult, commentResult] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name").in("user_id", reporterIds),
    postIds.length
      ? supabase.from("posts").select("id, title, slug").in("id", postIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? supabase.from("comments").select("id, post_id, body, status").in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileResult.error || postResult.error || commentResult.error) return null;

  const profiles = new Map(
    ((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile.display_name]),
  );
  const posts = new Map(
    ((postResult.data ?? []) as PostRow[]).map((post) => [post.id, post]),
  );
  const comments = new Map(
    ((commentResult.data ?? []) as CommentRow[]).map((comment) => [comment.id, comment]),
  );

  const relatedPostIds = [...new Set([
    ...postIds,
    ...[...comments.values()].map((comment) => comment.post_id),
  ])];
  const missingPostIds = relatedPostIds.filter((postId) => !posts.has(postId));
  if (missingPostIds.length) {
    const { data: relatedPosts, error: relatedPostsError } = await supabase
      .from("posts")
      .select("id, title, slug")
      .in("id", missingPostIds);
    if (relatedPostsError) return null;
    for (const post of (relatedPosts ?? []) as PostRow[]) posts.set(post.id, post);
  }

  return reports.map((report) => {
    const comment = report.comment_id ? comments.get(report.comment_id) : undefined;
    const targetPostId = report.post_id ?? comment?.post_id ?? null;
    const post = targetPostId ? posts.get(targetPostId) : undefined;
    return {
      id: report.id,
      reason: report.reason,
      createdAt: report.created_at,
      reporterName: profiles.get(report.reporter_id) || "Miembro de la comunidad",
      targetType: report.post_id ? "post" : "comment",
      targetId: report.post_id ?? report.comment_id ?? report.id,
      targetText: report.post_id ? post?.title ?? "Publicación no disponible" : comment?.body ?? "Comentario no disponible",
      targetStatus: comment?.status ?? null,
      postTitle: post?.title ?? null,
      postSlug: post?.slug ?? null,
    };
  });
}
