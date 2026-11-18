import Link from "next/link";
import type { ForumPost } from "@/backend/forum/posts";

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" });

function formatDate(value: string | null): string {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : dateFormatter.format(date);
}

export function ForumPostCard({ post }: { post: ForumPost }) {
  return (
    <article className="forum-post-card">
      <div className="forum-post-meta">
        <span className={`forum-kind forum-kind-${post.kind}`}>
          {post.kind === "news" ? "Noticia" : "Debate"}
        </span>
        <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
      </div>
      <h2><Link href={`/foro/${post.slug}`}>{post.title}</Link></h2>
      {post.excerpt ? <p className="forum-post-excerpt">{post.excerpt}</p> : null}
      <div className="forum-post-card-footer">
        <span>{post.authorName}</span>
        <div className="forum-category-list" aria-label="Categorías">
          {post.categories.map((category) => (
            <span className="forum-category-tag" key={category.id}>{category.name}</span>
          ))}
        </div>
      </div>
      {post.sourceUrl ? (
        <a className="forum-source-link" href={post.sourceUrl} rel="noreferrer noopener" target="_blank">
          Consultar fuente <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </article>
  );
}
