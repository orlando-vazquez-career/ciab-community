import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acceso de miembros | CIAB Community",
  description:
    "La interfaz de acceso de CIAB Community está en preparación. El registro aún no está habilitado.",
};

export default function AccessPage() {
  return (
    <main className="access-page">
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
            Estamos preparando el ingreso seguro y la gestión de membresías.
            Cuando el registro esté habilitado, cada cuenta comenzará pendiente
            y necesitará aprobación antes de participar.
          </p>
          <div className="access-policy-note">
            <span aria-hidden="true" className="access-policy-number">01</span>
            <p>La conversación pública seguirá abierta; participar requerirá una membresía activa.</p>
          </div>
        </section>

        <section aria-labelledby="card-title" className="access-card">
          <span className="access-status-badge">En preparación</span>
          <h2 id="card-title">Acceso de miembros</h2>
          <p className="access-card-copy" id="access-state" role="status">
            La autenticación y el registro todavía no están habilitados.
          </p>

          <fieldset
            aria-describedby="access-state"
            className="access-preview-fields"
            disabled
          >
            <legend className="access-visually-hidden">
              Vista previa del acceso, deshabilitada
            </legend>
            <div className="access-field-group">
              <label htmlFor="member-email">Correo electrónico</label>
              <input
                autoComplete="username"
                id="member-email"
                type="email"
                disabled
              />
            </div>
            <div className="access-field-group">
              <label htmlFor="member-password">Contraseña</label>
              <input
                autoComplete="current-password"
                id="member-password"
                type="password"
                disabled
              />
            </div>
            <button className="access-submit-button" disabled type="button">
              Iniciar sesión
            </button>
          </fieldset>

          <p className="access-privacy-note">
            No escribas datos reales: esta vista no envía ni guarda información.
          </p>
          <div className="access-card-footer">
            <span>Autenticación segura · próximamente</span>
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
