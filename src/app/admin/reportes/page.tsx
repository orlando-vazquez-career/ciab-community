import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canReviewPosts } from "@/backend/identity/policy";
import { listOpenForumReports } from "@/backend/interactions/reports";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { ForumHeader } from "@/frontend/forum/ForumHeader";
import { ReportResolutionActions } from "@/frontend/interactions/ReportResolutionActions";

export const metadata = { title: "Reportes | CIAB Community" };

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" });

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <section className="forum-empty-state" role="status">
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  );
}

export default async function ForumReportsPage() {
  await connection();
  if (!getLocalSupabaseConfiguration().available) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader />
        <Notice title="Los reportes no están habilitados">La moderación requiere la base de datos local y una sesión autorizada.</Notice>
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

  let reports;
  try {
    reports = await listOpenForumReports(supabase);
  } catch {
    reports = null;
  }
  if (!reports) {
    return (
      <main className="forum-page site-shell" id="main-content">
        <ForumHeader showReview showReports />
        <Notice title="No se pudieron cargar los reportes">Comprueba la base local y sus políticas de lectura para moderación.</Notice>
      </main>
    );
  }

  return (
    <main className="forum-page site-shell" id="main-content">
      <ForumHeader showReview showReports />
      <section className="forum-review-page" aria-labelledby="forum-reports-title">
        <p className="eyebrow">MODERACIÓN</p>
        <h1 id="forum-reports-title">Reportes abiertos</h1>
        <p className="forum-compose-intro">Resolver un reporte registra la decisión. Ocultar o restaurar contenido se realiza por separado desde su publicación.</p>
        {reports.length ? (
          <div className="forum-review-list">
            {reports.map((report) => {
              const targetHref = report.postSlug
                ? `/foro/${encodeURIComponent(report.postSlug)}${report.targetType === "comment" ? `#comment-${report.targetId}` : ""}`
                : null;
              const createdAt = new Date(report.createdAt);
              return (
                <article className="forum-review-card forum-report-card" key={report.id}>
                  <div className="forum-post-meta">
                    <span>{report.targetType === "post" ? "Publicación" : "Comentario"}</span>
                    <span>Reportado por {report.reporterName}</span>
                    {!Number.isNaN(createdAt.getTime()) ? <time dateTime={report.createdAt}>{dateFormatter.format(createdAt)}</time> : null}
                  </div>
                  {report.postTitle ? <h2>{report.postTitle}</h2> : null}
                  <blockquote>{report.targetText}</blockquote>
                  {report.targetStatus ? <p className="forum-form-note">Estado actual del comentario: {report.targetStatus}.</p> : null}
                  <p><strong>Motivo:</strong> {report.reason}</p>
                  {targetHref ? <p><Link href={targetHref}>Abrir contenido relacionado ↗</Link></p> : <p className="forum-form-note">El contenido relacionado ya no está disponible.</p>}
                  <ReportResolutionActions reportId={report.id} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="forum-empty-state">
            <h2>No hay reportes abiertos.</h2>
            <p>La cola de moderación está al día.</p>
          </div>
        )}
      </section>
    </main>
  );
}
