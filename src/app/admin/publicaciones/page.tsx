import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canReviewPosts } from "@/backend/identity/policy";
import { listPendingReviewPosts } from "@/backend/forum/posts";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { ForumHeader } from "@/frontend/forum/ForumHeader";
import { PostReviewActions } from "@/frontend/forum/PostReviewActions";

export const metadata = { title: "Revisión de publicaciones | CIAB Community" };

const sourceClassLabels: Record<string, string> = {
  primary: "Fuente primaria",
  institutional: "Fuente institucional",
  specialized_media: "Medio especializado",
  general_media: "Medio general",
};

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <section className="forum-empty-state" role="status">
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  );
}

export default async function ForumReviewPage() {
  await connection();
  if (!getLocalSupabaseConfiguration().available) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="La revisión no está habilitada">La moderación requiere la base de datos local y una sesión autorizada.</Notice>
      </main>
    );
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  let current: Awaited<ReturnType<typeof getCurrentIdentity>> | null = null;
  try {
    supabase = await createSupabaseServerClient();
    current = await getCurrentIdentity(supabase);
  } catch {
    supabase = null;
    current = null;
  }
  if (!supabase || !current) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="No se pudo consultar la sesión">El servicio local no respondió. Inténtalo más tarde.</Notice>
      </main>
    );
  }

  if (current.kind === "anonymous") redirect("/acceso");
  if (current.kind === "unavailable") {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="No se pudo consultar la membresía">El servicio local no respondió. Inténtalo más tarde.</Notice>
      </main>
    );
  }
  if (!canReviewPosts(current.identity)) redirect("/miembro");

  let posts;
  try {
    posts = await listPendingReviewPosts(supabase);
  } catch {
    posts = null;
  }
  if (!posts) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader showReview />
        <Notice title="No se pudo cargar la cola">Comprueba la base local y sus políticas de lectura para moderación.</Notice>
      </main>
    );
  }

  return (
    <main className="forum-page site-shell" id="main-content">
      <ForumHeader showReview />
      <section className="forum-review-page" aria-labelledby="forum-review-title">
        <p className="eyebrow">MODERACIÓN</p>
        <h1 id="forum-review-title">Cola de revisión</h1>
        <p className="forum-compose-intro">
          Los envíos están ocultos al público hasta que un moderador los publique. Cada decisión queda registrada.
        </p>
        {posts.length ? (
          <div className="forum-review-list">
            {posts.map((post) => (
              <article className="forum-review-card" key={post.id}>
                <div className="forum-post-meta">
                  <span className={`forum-kind forum-kind-${post.kind}`}>
                    {post.kind === "news" ? "Noticia" : "Debate"}
                  </span>
                  <span>{post.authorName}{post.authorUsername ? ` · @${post.authorUsername}` : ""}</span>
                </div>
                <h2>{post.title}</h2>
                {post.excerpt ? <p>{post.excerpt}</p> : null}
                {post.sourceUrl ? (
                  <p className="forum-review-source">
                    {post.sourceClass ? `${sourceClassLabels[post.sourceClass] ?? "Fuente"} · ` : ""}
                    <a href={post.sourceUrl} rel="noreferrer noopener" target="_blank">Consultar fuente ↗</a>
                  </p>
                ) : null}
                <details className="forum-review-content">
                  <summary>Leer contenido completo</summary>
                  <div className="forum-article-body">{post.body ?? ""}</div>
                </details>
                <div className="forum-category-list">
                  {post.categories.map((category) => (
                    <span className="forum-category-tag" key={category.id}>{category.name}</span>
                  ))}
                </div>
                <PostReviewActions postId={post.id} />
              </article>
            ))}
          </div>
        ) : (
          <div className="forum-empty-state">
            <h2>La cola está al día.</h2>
            <p>No hay publicaciones pendientes de revisión.</p>
          </div>
        )}
      </section>
    </main>
  );
}
