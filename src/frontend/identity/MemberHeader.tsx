import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function MemberHeader() {
  return (
    <header className="member-header">
      <Link aria-label="CIAB Community, inicio" className="brand" href="/">
        <span aria-hidden="true" className="brand-mark">C</span>
        <span className="brand-name">
          <strong>CIAB</strong>
          <span>COMMUNITY</span>
        </span>
      </Link>
      <nav aria-label="Cuenta de miembro" className="member-nav">
        <Link href="/miembro">Mi membresía</Link>
        <Link href="/miembro/perfil">Mi perfil</Link>
        <SignOutButton />
      </nav>
    </header>
  );
}
