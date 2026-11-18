import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPublishedPostBySlug } from "@/backend/forum/posts";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { ForumHeader } from "@/frontend/forum/ForumHeader";

export const metadata = { title: "Publicación | CIAB Community" };

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "long" });
const sourceLabels: Record<string, string> = {
  primary: "Fuente primaria",
  institutional: "Fuente institucional",
  specialized_media: "Medio especializado",
  general_media: "Medio general",
};

type PostPageProps = { params: Promise<{ slug: string }> };
type PublishedForumPost = Awaited<ReturnType<typeof getPublishedPostBySlug>>;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

function PostUnavailable() {
  return (
    <section className="forum-empty-state" role="status">
      <h1>No se pudo cargar la publicación</h1>
      <p>El servicio local no respondió. Inténtalo nuevamente más tarde.</p>
    </section>
  );
}

function LocalUnavailable() {
  return (
    <section className="forum-empty-state" role="status">
      <h1>El foro local no está habilitado</h1>
      <p>Las publicaciones estarán disponibles cuando exista una base de datos local segura y conectada.</p>
    </section>
  );
}

export default async function ForumPostPage({ params }: PostPageProps) {
  await connection();
  const { slug } = await params;
  if (!getLocalSupabaseConfiguration().available) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <LocalUnavailable />
      </main>
    );
  }

  let post: PublishedForumPost;
  try {
    const supabase = await createSupabaseServerClient();
    post = await getPublishedPostBySlug(supabase, slug);
  } catch {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <PostUnavailable />
      </main>
    );
  }

  if (post === undefined) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <PostUnavailable />
      </main>
    );
  }
  if (post === null) notFound();

  const publishedDate = formatDate(post.publishedAt);
  return (
    <main className="forum-page site-shell" id="main-content">
      <ForumHeader />
      <article className="forum-article">
        <Link className="forum-back-link" href="/foro">← Volver al foro</Link>
        <div className="forum-post-meta">
          <span className={`forum-kind forum-kind-${post.kind}`}>
            {post.kind === "news" ? "Noticia" : "Debate"}
          </span>
          {publishedDate && post.publishedAt ? (
            <time dateTime={post.publishedAt}>{publishedDate}</time>
          ) : null}
        </div>
        <h1>{post.title}</h1>
        {post.excerpt ? <p className="forum-article-excerpt">{post.excerpt}</p> : null}
        <p className="forum-article-author">
          Por {post.authorName}{post.authorUsername ? ` · @${post.authorUsername}` : ""}
        </p>
        <div className="forum-category-list">
          {post.categories.map((category) => (
            <Link className="forum-category-tag" href={`/foro?categoria=${encodeURIComponent(category.slug)}`} key={category.id}>
              {category.name}
            </Link>
          ))}
        </div>
        <div className="forum-article-body">{post.body ?? ""}</div>
        {post.sourceUrl ? (
          <aside className="forum-article-source">
            <p className="eyebrow">FUENTE</p>
            <span>{post.sourceClass ? sourceLabels[post.sourceClass] ?? "Fuente" : "Fuente"}</span>
            <a href={post.sourceUrl} rel="noreferrer noopener" target="_blank">
              {post.sourceUrl} <span aria-hidden="true">↗</span>
            </a>
          </aside>
        ) : null}
      </article>
    </main>
  );
}
