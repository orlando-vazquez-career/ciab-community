import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  getCurrentIdentity,
  listMemberships,
} from "@/backend/identity/membership";
import { canManageMemberships, canManageRoles } from "@/backend/identity/policy";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { MemberHeader } from "@/frontend/identity/MemberHeader";
import { MembershipAdmin } from "@/frontend/identity/MembershipAdmin";

export const metadata = { title: "Gestión de membresías | CIAB Community" };

export default async function MembershipAdminPage() {
  await connection();
  if (!getLocalSupabaseConfiguration().available) {
    return (
      <main className="member-page" id="main-content">
        <header className="member-header">
          <Link className="brand" href="/">CIAB COMMUNITY</Link>
          <Link href="/acceso">Volver al acceso</Link>
        </header>
        <section className="member-content">
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>El servicio local no está habilitado</h1>
          <p>La gestión requiere autenticación y una base de datos local disponible.</p>
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
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>No se pudo consultar la sesión</h1>
        </section>
      </main>
    );
  }
  if (!canManageMemberships(current.identity) || !current.identity.role) redirect("/miembro");

  const members = await listMemberships(supabase);
  if (!members) {
    return (
      <main className="member-page" id="main-content">
        <MemberHeader />
        <section className="member-content">
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>No se pudieron cargar las membresías</h1>
          <p>Comprueba el esquema local y sus políticas RLS.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="member-page" id="main-content">
      <MemberHeader />
      <div className="member-content membership-admin-content">
        <MembershipAdmin
          canAssignRoles={canManageRoles(current.identity)}
          currentRole={current.identity.role}
          currentUserId={current.identity.userId}
          members={members}
        />
      </div>
    </main>
  );
}
