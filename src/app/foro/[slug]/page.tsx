import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canReviewPosts } from "@/backend/identity/policy";
import { getPublishedPostBySlug } from "@/backend/forum/posts";
import { canCreateComment, canReportContent, canVoteOnPost } from "@/backend/interactions/policy";
import { listPostComments } from "@/backend/interactions/comments";
import { hasUserVotedForPost } from "@/backend/interactions/votes";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { ForumHeader } from "@/frontend/forum/ForumHeader";
import { ForumCommentList } from "@/frontend/interactions/ForumCommentList";
import { PostVoteButton } from "@/frontend/interactions/PostVoteButton";
import { ReportForm } from "@/frontend/interactions/ReportForm";

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
  let supabase: SupabaseClient;
  try {
    supabase = await createSupabaseServerClient();
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

  const [comments, current] = await Promise.all([
    listPostComments(supabase, post.id).catch(() => null),
    getCurrentIdentity(supabase).catch(() => ({ kind: "unavailable" as const })),
  ]);
  const isAuthenticated = current.kind === "member";
  const canComment = current.kind === "member" && canCreateComment(current.identity);
  const canReport = current.kind === "member" && canReportContent(current.identity);
  const canModerate = current.kind === "member" && canReviewPosts(current.identity);
  const canVote = current.kind === "member" && canVoteOnPost(current.identity, post.authorId);
  const voteState = canVote
    ? await hasUserVotedForPost(supabase, post.id, current.identity.userId).catch(() => null)
    : null;
  const publishedDate = formatDate(post.publishedAt);
  return (
    <main className="forum-page site-shell" id="main-content">
      <ForumHeader showReview={canModerate} showReports={canModerate} />
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
        <div className="forum-article-engagement">
          {canVote && voteState !== null ? (
            <PostVoteButton hasVoted={voteState} postId={post.id} />
          ) : canVote ? (
            <p className="forum-form-note">No se pudo consultar el estado del voto.</p>
          ) : current.kind === "member" && current.identity.status === "active" && current.identity.userId === post.authorId ? (
            <p className="forum-form-note">No puedes votar tu propia publicación.</p>
          ) : null}
          <ReportForm canReport={canReport} isAuthenticated={isAuthenticated} targetId={post.id} targetType="post" />
        </div>
      </article>
      {current.kind === "unavailable" ? (
        <p className="forum-form-note" role="status">No se pudieron comprobar tus permisos; las acciones están deshabilitadas.</p>
      ) : null}
      {comments ? (
        <ForumCommentList
          canComment={canComment}
          canModerate={canModerate}
          canReport={canReport}
          comments={comments}
          isAuthenticated={isAuthenticated}
          postId={post.id}
        />
      ) : (
        <section className="forum-empty-state" role="status">
          <h2>No se pudieron cargar los comentarios</h2>
          <p>El resto de la publicación sigue disponible; vuelve a intentarlo más tarde.</p>
        </section>
      )}
    </main>
  );
}
