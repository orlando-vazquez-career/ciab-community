import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { listActiveCategories } from "@/backend/forum/posts";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { ForumHeader } from "@/frontend/forum/ForumHeader";
import { PostSubmissionForm } from "@/frontend/forum/PostSubmissionForm";

export const metadata = { title: "Enviar publicación | CIAB Community" };

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <section className="forum-empty-state" role="status">
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  );
}

export default async function NewForumPostPage() {
  await connection();
  if (!getLocalSupabaseConfiguration().available) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="El envío no está habilitado">La autenticación y la base local están apagadas por seguridad.</Notice>
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
        <Notice title="El servicio local no respondió">No se pudo comprobar la membresía ni las categorías disponibles.</Notice>
      </main>
    );
  }

  if (current.kind === "anonymous") redirect("/acceso");
  if (current.kind === "unavailable") {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="No se pudo consultar tu sesión">El servicio local no respondió. Inténtalo nuevamente más tarde.</Notice>
      </main>
    );
  }
  if (current.identity.status !== "active") {
    const statusCopy = current.identity.status === "pending"
      ? "Tu membresía está pendiente de aprobación. Podrás enviar publicaciones cuando se active."
      : current.identity.status === "suspended"
        ? "La membresía está suspendida y no puede enviar publicaciones."
        : "No se encontró una membresía activa asociada a esta cuenta.";
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="Se requiere una membresía activa">{statusCopy}</Notice>
      </main>
    );
  }

  const categories = await listActiveCategories(supabase).catch(() => null);
  if (!categories) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="No se pudieron cargar las categorías">Inténtalo nuevamente cuando el servicio local esté disponible.</Notice>
      </main>
    );
  }
  if (categories.length === 0) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="No hay categorías disponibles">La publicación requiere una categoría activa. Revisa la configuración local.</Notice>
      </main>
    );
  }

  return (
    <main className="forum-page site-shell" id="main-content">
      <ForumHeader />
      <section className="forum-compose" aria-labelledby="forum-compose-title">
        <Link className="forum-back-link" href="/foro">← Volver al foro</Link>
        <p className="eyebrow">APORTE DE LA COMUNIDAD</p>
        <h1 id="forum-compose-title">Una idea bien situada.</h1>
        <p className="forum-compose-intro">
          Los envíos comienzan en revisión. Las noticias requieren una fuente directa; los debates pueden incluirla de forma opcional.
        </p>
        <PostSubmissionForm categories={categories} />
      </section>
    </main>
  );
}
