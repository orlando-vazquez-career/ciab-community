import Link from "next/link";
import { connection } from "next/server";
import { listActiveCategories, listPublishedPosts } from "@/backend/forum/posts";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { ForumHeader } from "@/frontend/forum/ForumHeader";
import { ForumPostCard } from "@/frontend/forum/ForumPostCard";

export const metadata = { title: "Foro | CIAB Community" };

type ForumPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pageHref(page: number, categorySlug?: string): string {
  const params = new URLSearchParams({ pagina: String(page) });
  if (categorySlug) params.set("categoria", categorySlug);
  return `/foro?${params.toString()}`;
}

function ForumNotice({ title, children }: { title: string; children: string }) {
  return (
    <section className="forum-empty-state" role="status">
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  );
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  await connection();
  const parameters = await searchParams;
  const pageParameter = parameters.pagina;
  const requestedPage = pageParameter === undefined
    ? 1
    : typeof pageParameter === "string"
      ? Number(pageParameter)
      : Number.NaN;
  const categoryParameter = parameters.categoria;
  const categorySlug = categoryParameter === undefined
    ? undefined
    : typeof categoryParameter === "string"
      ? categoryParameter.trim() || undefined
      : "__invalid__";
  const pageIsValid = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 1000;

  if (!getLocalSupabaseConfiguration().available) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <ForumNotice title="El foro local no está habilitado">
          Las publicaciones requieren una sesión y una base de datos Supabase local configurada de forma segura.
        </ForumNotice>
      </main>
    );
  }

  if (!pageIsValid) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <ForumNotice title="La página solicitada no es válida">Vuelve al inicio del foro para continuar.</ForumNotice>
      </main>
    );
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    supabase = null;
  }
  if (!supabase) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <ForumNotice title="El servicio local no respondió">No se cargó contenido. Inténtalo nuevamente más tarde.</ForumNotice>
      </main>
    );
  }

  const categories = await listActiveCategories(supabase).catch(() => null);
  if (!categories) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <ForumNotice title="No se pudieron cargar las categorías">Comprueba que la base local y sus políticas RLS estén disponibles.</ForumNotice>
      </main>
    );
  }

  const selectedCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : undefined;
  if (categorySlug && !selectedCategory) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <ForumNotice title="La categoría no está disponible">Elige una categoría activa o vuelve a todas las publicaciones.</ForumNotice>
      </main>
    );
  }

  const feed = await listPublishedPosts(supabase, {
    page: requestedPage,
    ...(selectedCategory ? { categoryId: selectedCategory.id } : {}),
  }).catch(() => null);
  if (!feed) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <ForumNotice title="No se pudieron cargar las publicaciones">Inténtalo nuevamente cuando el servicio local esté disponible.</ForumNotice>
      </main>
    );
  }

  return (
    <main className="forum-page site-shell" id="main-content">
      <ForumHeader />
      <section className="forum-intro" aria-labelledby="forum-title">
        <p className="eyebrow">CIAB / CONVERSACIÓN PÚBLICA</p>
        <div className="forum-intro-heading">
          <div>
            <h1 id="forum-title">Ideas con contexto.</h1>
            <p>Noticias con fuentes y debates abiertos sobre inteligencia artificial en Bolivia.</p>
          </div>
          <Link className="forum-primary-link" href="/foro/nueva">Enviar una publicación <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="forum-feed-section" aria-labelledby="forum-feed-title">
        <div className="forum-feed-heading">
          <div>
            <p className="eyebrow">PUBLICACIONES REVISADAS</p>
            <h2 id="forum-feed-title">{selectedCategory ? selectedCategory.name : "Más recientes"}</h2>
          </div>
          <form action="/foro" className="forum-filter-form" method="get">
            <label htmlFor="forum-category-filter">Filtrar por categoría</label>
            <select defaultValue={selectedCategory?.slug ?? ""} id="forum-category-filter" name="categoria">
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>{category.name}</option>
              ))}
            </select>
            <button type="submit">Aplicar</button>
          </form>
        </div>

        {feed.posts.length ? (
          <div className="forum-post-list">
            {feed.posts.map((post) => <ForumPostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="forum-empty-state">
            <h3>Aún no hay publicaciones en esta vista.</h3>
            <p>Los envíos aparecerán aquí después de la revisión de moderación.</p>
          </div>
        )}

        {feed.total > feed.pageSize ? (
          <nav aria-label="Paginación del foro" className="forum-pagination">
            {feed.page > 1 ? <Link href={pageHref(feed.page - 1, selectedCategory?.slug)}>← Más recientes</Link> : <span />}
            <span>Página {feed.page} · {feed.total} publicaciones</span>
            {feed.hasMore ? <Link href={pageHref(feed.page + 1, selectedCategory?.slug)}>Más antiguas →</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
