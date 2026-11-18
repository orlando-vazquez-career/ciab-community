import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";
import { MemberHeader } from "@/frontend/identity/MemberHeader";
import { ProfileForm } from "@/frontend/identity/ProfileForm";

export const metadata = { title: "Mi perfil | CIAB Community" };

export default async function ProfilePage() {
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
          <p>El perfil se podrá editar cuando la autenticación local esté configurada.</p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const current = await getCurrentIdentity(supabase);
  if (current.kind === "anonymous") redirect("/acceso");
  if (current.kind === "unavailable" || !current.identity.profile) {
    return (
      <main className="member-page" id="main-content">
        <MemberHeader />
        <section className="member-content">
          <p className="eyebrow">IDENTIDAD Y MEMBRESÍA</p>
          <h1>No se pudo cargar el perfil</h1>
          <p>Comprueba el servicio local y vuelve a intentar.</p>
        </section>
      </main>
    );
  }

  const avatarUrl = current.identity.profile.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(current.identity.profile.avatar_path).data.publicUrl
    : null;

  return (
    <main className="member-page" id="main-content">
      <MemberHeader />
      <section className="member-content profile-content">
        <p className="eyebrow">CIAB / PERFIL DE MIEMBRO</p>
        <h1>Tu perfil público.</h1>
        <p className="access-intro-copy">
          El correo de autenticación permanece privado. El nombre de usuario, el nombre visible y la biografía pueden mostrarse en la comunidad.
        </p>
        <ProfileForm avatarUrl={avatarUrl} profile={current.identity.profile} />
      </section>
    </main>
  );
}
