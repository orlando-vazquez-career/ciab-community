import type { MemberIdentity } from "../identity/membership";

export function canCreateComment(identity: MemberIdentity): boolean {
  return identity.status === "active";
}

export function canReportContent(identity: MemberIdentity): boolean {
  return identity.status === "active";
}

export function canVoteOnPost(identity: MemberIdentity, postAuthorId: string): boolean {
  return identity.status === "active" && identity.userId !== postAuthorId;
}
