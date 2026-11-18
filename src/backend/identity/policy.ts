import type { MemberIdentity } from "./membership";

export function canManageMemberships(identity: MemberIdentity): boolean {
  return (
    identity.status === "active" &&
    (identity.role === "admin" || identity.role === "superadmin")
  );
}

export function canManageRoles(identity: MemberIdentity): boolean {
  return identity.status === "active" && identity.role === "superadmin";
}
