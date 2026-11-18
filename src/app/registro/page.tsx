import type { Metadata } from "next";
import Link from "next/link";
import { RegistrationForm } from "@/frontend/identity/RegistrationForm";

export const metadata: Metadata = {
  title: "Registro de miembros | CIAB Community",
  description: "Crea tu cuenta y solicita una membresía en CIAB Community.",
};

export default function RegistrationPage() {
  return (
    <main className="registration-page" id="main-content">
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
            Confirma tu correo y la cuenta quedará pendiente de revisión. Un
            administrador debe aprobar la membresía antes de habilitar la participación.
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
          <span className="access-status-badge">Solicitud de membresía</span>
          <h2 id="registration-card-title">Registro de miembros</h2>
          <RegistrationForm />
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
