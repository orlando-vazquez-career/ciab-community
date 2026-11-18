import type { Metadata } from "next";
import Link from "next/link";
import { AccessForm } from "@/frontend/identity/AccessForm";

export const metadata: Metadata = {
  title: "Acceso de miembros | CIAB Community",
  description: "Ingresa a tu cuenta de CIAB Community y consulta el estado de tu membresía.",
};

type AccessPageProps = {
  searchParams: Promise<{ estado?: string }>;
};

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const { estado } = await searchParams;
  const initialMessage =
    estado === "confirmacion-fallida"
      ? "No se pudo confirmar el correo. Solicita un nuevo enlace o vuelve a intentarlo."
      : "";

  return (
    <main className="access-page" id="main-content">
      <header className="access-header">
        <Link aria-label="CIAB Community, inicio" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">C</span>
          <span className="brand-name">
            <strong>CIAB</strong>
            <span>COMMUNITY</span>
          </span>
        </Link>
        <Link className="access-return-link" href="/">
          Volver a la portada
        </Link>
      </header>

      <div className="access-content">
        <section aria-labelledby="access-title" className="access-intro">
          <p className="access-kicker">CIAB / ACCESO DE MIEMBROS</p>
          <h1 id="access-title">Una comunidad que se construye con confianza.</h1>
          <p className="access-intro-copy">
            Confirma tu correo al registrarte. Cada cuenta comienza pendiente y
            necesita aprobación antes de participar.
          </p>
          <div className="access-policy-note">
            <span aria-hidden="true" className="access-policy-number">01</span>
            <p>La conversación pública seguirá abierta; participar requerirá una membresía activa.</p>
          </div>
        </section>

        <section aria-labelledby="card-title" className="access-card">
          <span className="access-status-badge">Acceso de miembros</span>
          <h2 id="card-title">Acceso de miembros</h2>
          <AccessForm initialMessage={initialMessage} />
          <p className="access-register-prompt">
            ¿Buscas sumarte?{" "}
            <Link href="/registro">Conoce el proceso de membresía</Link>.
          </p>
          <div className="access-card-footer">
            <span>Correo · contraseña · membresía</span>
            <span aria-hidden="true">↗</span>
          </div>
        </section>
      </div>

      <footer className="access-footer">
        <span>CIAB COMMUNITY · BOLIVIA</span>
        <Link href="/#proposito">Conoce el propósito</Link>
      </footer>
    </main>
  );
}
