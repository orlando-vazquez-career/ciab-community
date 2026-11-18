import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ForumCategory = { id: string; name: string; slug: string };

export type ForumPost = {
  id: string;
  kind: "news" | "discussion";
  title: string;
  slug: string;
  excerpt: string;
  body: string | null;
  sourceUrl: string | null;
  sourceClass: string | null;
  publishedAt: string | null;
  authorName: string;
  authorUsername: string | null;
  categories: ForumCategory[];
};

export type ForumFeed = {
  posts: ForumPost[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

type Embedded<T> = T | T[] | null | undefined;
type RawAuthor = { display_name: string; username: string };
type RawCategory = ForumCategory;
type RawPost = {
  id: string;
  kind: "news" | "discussion";
  title: string;
  slug: string;
  excerpt: string;
  body_md?: string;
  source_url: string | null;
  source_class: string | null;
  published_at: string | null;
  profiles?: Embedded<RawAuthor>;
  post_categories?: Array<{
    category_id: string;
    categories?: Embedded<RawCategory>;
  }>;
};

const pageSize = 20;

function one<T>(value: Embedded<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapPost(row: RawPost): ForumPost {
  const author = one(row.profiles);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    body: row.body_md ?? null,
    sourceUrl: row.source_url,
    sourceClass: row.source_class,
    publishedAt: row.published_at,
    authorName: author?.display_name || "Miembro de la comunidad",
    authorUsername: author?.username ?? null,
    categories: (row.post_categories ?? []).flatMap((item) => {
      const category = one(item.categories);
      return category ? [category] : [];
    }),
  };
}

export async function listActiveCategories(
  supabase: SupabaseClient,
): Promise<ForumCategory[] | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return null;
  return (data ?? []) as ForumCategory[];
}

export async function listPublishedPosts(
  supabase: SupabaseClient,
  options: { page: number; categoryId?: string },
): Promise<ForumFeed | null> {
  const page = Math.max(1, Math.min(options.page, 1000));
  const from = (page - 1) * pageSize;
  const categorySelection = options.categoryId
    ? "post_categories!inner(category_id, categories(id, name, slug))"
    : "post_categories(category_id, categories(id, name, slug))";
  const selection = [
    "id",
    "kind",
    "title",
    "slug",
    "excerpt",
    "source_url",
    "source_class",
    "published_at",
    "profiles(display_name, username)",
    categorySelection,
  ].join(", ");

  let query = supabase
    .from("posts")
    .select(selection, { count: "exact" })
    .eq("status", "published");

  if (options.categoryId) query = query.eq("post_categories.category_id", options.categoryId);

  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) return null;
  const rows = (data ?? []) as unknown as RawPost[];
  const total = count ?? rows.length;
  return {
    posts: rows.map(mapPost),
    page,
    pageSize,
    total,
    hasMore: from + rows.length < total,
  };
}

export async function getPublishedPostBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<ForumPost | null | undefined> {
  const selection = [
    "id",
    "kind",
    "title",
    "slug",
    "excerpt",
    "body_md",
    "source_url",
    "source_class",
    "published_at",
    "profiles(display_name, username)",
    "post_categories(category_id, categories(id, name, slug))",
  ].join(", ");
  const { data, error } = await supabase
    .from("posts")
    .select(selection)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return undefined;
  return data ? mapPost(data as unknown as RawPost) : null;
}

export async function listPendingReviewPosts(
  supabase: SupabaseClient,
): Promise<ForumPost[] | null> {
  const selection = [
    "id",
    "kind",
    "title",
    "slug",
    "excerpt",
    "body_md",
    "source_url",
    "source_class",
    "published_at",
    "profiles(display_name, username)",
    "post_categories(category_id, categories(id, name, slug))",
  ].join(", ");
  const { data, error } = await supabase
    .from("posts")
    .select(selection)
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return null;
  return ((data ?? []) as unknown as RawPost[]).map(mapPost);
}
