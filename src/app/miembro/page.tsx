import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canManageMemberships } from "@/backend/identity/policy";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { MemberHeader } from "@/frontend/identity/MemberHeader";

export const metadata = { title: "Mi membresía | CIAB Community" };

export default async function MemberPage() {
  await connection();
  if (!getLocalSupabaseConfiguration().available) {
    return (
      <main className="member-page" id="main-content">
        <header className="member-header">
          <Link className="brand" href="/">CIAB COMMUNITY</Link>
          <Link href="/acceso">Volver al acceso</Link>
        </header>
        <section className="member-content">
          <p className="eyebrow">IDENTIDAD Y MEMBRESÍA</p>
          <h1>El servicio local no está habilitado</h1>
          <p>Esta vista no puede comprobar una sesión hasta que se configure Supabase local.</p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const current = await getCurrentIdentity(supabase);
  if (current.kind === "anonymous") redirect("/acceso");
  if (current.kind === "unavailable") {
    return (
      <main className="member-page" id="main-content">
        <MemberHeader />
        <section className="member-content">
          <p className="eyebrow">IDENTIDAD Y MEMBRESÍA</p>
          <h1>No se pudo consultar tu cuenta</h1>
          <p>El servicio local de autenticación o la base de datos no respondió. Inténtalo más tarde.</p>
        </section>
      </main>
    );
  }

  const { identity } = current;
  const canAdminister = canManageMemberships(identity);
  const statusCopy = {
    pending: "Tu cuenta fue confirmada y la solicitud de membresía está pendiente de revisión.",
    active: "Tu membresía está activa. Las funciones para miembros se habilitarán conforme avance el MVP.",
    suspended: "Tu membresía está suspendida. No puedes participar mientras este estado se mantenga.",
  } as const;
  const statusLabels = { pending: "Pendiente", active: "Activa", suspended: "Suspendida" } as const;
  const roleLabels = {
    member: "Miembro",
    moderator: "Moderador",
    admin: "Administrador",
    superadmin: "Superadministrador",
  } as const;

  return (
    <main className="member-page" id="main-content">
      <MemberHeader />
      <section className="member-content">
        <p className="eyebrow">CIAB / MIEMBROS</p>
        <h1>Hola, {identity.profile?.display_name ?? "miembro"}.</h1>
        {identity.status ? (
          <div className="member-status-card">
            <span className={`membership-status membership-status-${identity.status}`}>
              {statusLabels[identity.status]}
            </span>
            <p>{statusCopy[identity.status]}</p>
          </div>
        ) : (
          <p className="identity-feedback identity-feedback-error" role="alert">
            No se encontró una membresía asociada a esta cuenta. El acceso se mantiene bloqueado.
          </p>
        )}
        {identity.profile ? (
          <dl className="member-profile-summary">
            <div><dt>Nombre de usuario</dt><dd>@{identity.profile.username}</dd></div>
            <div>
              <dt>Rol</dt>
              <dd>{identity.role ? roleLabels[identity.role] : "Sin rol"}</dd>
            </div>
          </dl>
        ) : null}
        <div className="member-links">
          <Link className="member-action-link" href="/miembro/perfil">Editar mi perfil <span aria-hidden="true">↗</span></Link>
          {canAdminister ? (
            <Link className="member-action-link" href="/admin/membresias">Gestionar membresías <span aria-hidden="true">↗</span></Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
