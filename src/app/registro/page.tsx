import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Registro en preparación | CIAB Community",
  description:
    "El registro de miembros de CIAB Community aún no está habilitado.",
};

export default function RegistrationPage() {
  return (
    <main className="registration-page">
      <header className="access-header">
        <Link aria-label="CIAB Community, inicio" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">C</span>
          <span className="brand-name">
            <strong>CIAB</strong>
            <span>COMMUNITY</span>
          </span>
        </Link>
        <Link className="access-return-link" href="/acceso">
          Volver al acceso
        </Link>
      </header>

      <div className="registration-content">
        <section aria-labelledby="registration-title" className="registration-intro">
          <p className="access-kicker">CIAB / MEMBRESÍA</p>
          <h1 id="registration-title">
            La participación comienza con una membresía activa.
          </h1>
          <p className="access-intro-copy">
            La comunidad está preparando un proceso de ingreso claro y seguro.
            Las cuentas nuevas comenzarán con estado pendiente y necesitarán
            aprobación antes de participar.
          </p>
          <div className="access-policy-note">
            <span aria-hidden="true" className="access-policy-number">01</span>
            <p>
              La lectura pública será abierta; publicar, comentar y votar
              requerirá una membresía activa.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="registration-card-title"
          className="registration-card"
        >
          <span className="access-status-badge">En preparación</span>
          <h2 id="registration-card-title">Registro de miembros</h2>
          <p className="registration-card-copy" id="registration-state" role="status">
            El registro todavía no está habilitado; por ahora no recibimos
            solicitudes.
          </p>

          <ol aria-describedby="registration-state" className="registration-steps">
            <li>
              <strong>Cuenta pendiente</strong>
              <span>La cuenta comienza con estado pendiente y sin permisos para participar.</span>
            </li>
            <li>
              <strong>Revisión de membresía</strong>
              <span>El equipo revisa la solicitud antes de habilitarla.</span>
            </li>
            <li>
              <strong>Participación activa</strong>
              <span>La membresía activa permite publicar, comentar y votar.</span>
            </li>
          </ol>

          <p className="access-privacy-note">
            No escribas datos reales: esta página solo explica el proceso; no
            envía ni guarda información.
          </p>
          <Link className="registration-back-link" href="/acceso">
            Volver al acceso de miembros
          </Link>
        </section>
      </div>

      <footer className="access-footer">
        <span>CIAB COMMUNITY · BOLIVIA</span>
        <Link href="/#proposito">Conoce el propósito</Link>
      </footer>
    </main>
  );
}
