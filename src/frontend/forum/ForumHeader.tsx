import Link from "next/link";

export function ForumHeader({ showReview = false, showReports = false }: { showReview?: boolean; showReports?: boolean }) {
  return (
    <header className="forum-header">
      <Link aria-label="CIAB Community, inicio" className="brand" href="/">
        <span aria-hidden="true" className="brand-mark">C</span>
        <span className="brand-name">
          <strong>CIAB</strong>
          <span>COMMUNITY</span>
        </span>
      </Link>
      <nav aria-label="Navegación del foro" className="forum-nav">
        <Link href="/foro">Foro</Link>
        <Link href="/foro/nueva">Enviar publicación</Link>
        {showReview ? <Link href="/admin/publicaciones">Revisión</Link> : null}
        {showReports ? <Link href="/admin/reportes">Reportes</Link> : null}
        <Link href="/miembro">Mi membresía</Link>
      </nav>
    </header>
  );
}
