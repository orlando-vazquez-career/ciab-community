import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberStatus = "pending" | "active" | "suspended";
export type MemberRole = "member" | "moderator" | "admin" | "superadmin";

export type MemberProfile = {
  username: string;
  display_name: string;
  bio: string;
  avatar_path: string | null;
};

export type MemberIdentity = {
  userId: string;
  status: MemberStatus | null;
  role: MemberRole | null;
  profile: MemberProfile | null;
};

export type IdentityLookup =
  | { kind: "anonymous" }
  | { kind: "unavailable" }
  | { kind: "member"; identity: MemberIdentity };

export type MembershipListItem = {
  userId: string;
  status: MemberStatus;
  role: MemberRole;
  createdAt: string;
  approvedAt: string | null;
  profile: Pick<MemberProfile, "username" | "display_name"> | null;
};

type AccessRow = {
  user_id: string;
  status: MemberStatus;
  role: MemberRole;
  created_at: string;
  approved_at: string | null;
};

type ProfileRow = MemberProfile & { user_id: string };

export async function getCurrentIdentity(supabase: SupabaseClient): Promise<IdentityLookup> {
  const { data, error } = await supabase.auth.getClaims();
  if (error && error.name !== "AuthSessionMissingError") return { kind: "unavailable" };
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : "";
  if (!userId) return { kind: "anonymous" };

  const [accessResult, profileResult] = await Promise.all([
    supabase
      .from("member_access")
      .select("status, role")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("username, display_name, bio, avatar_path")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (accessResult.error || profileResult.error) return { kind: "unavailable" };

  const access = accessResult.data as Pick<AccessRow, "status" | "role"> | null;
  const profile = profileResult.data as MemberProfile | null;
  return {
    kind: "member",
    identity: {
      userId,
      status: access?.status ?? null,
      role: access?.role ?? null,
      profile,
    },
  };
}

export async function listMemberships(
  supabase: SupabaseClient,
): Promise<MembershipListItem[] | null> {
  const { data: accessData, error: accessError } = await supabase
    .from("member_access")
    .select("user_id, status, role, created_at, approved_at")
    .order("created_at", { ascending: false });

  if (accessError) return null;
  const accessRows = (accessData ?? []) as AccessRow[];
  if (accessRows.length === 0) return [];

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, username, display_name")
    .in("user_id", accessRows.map((row) => row.user_id));

  if (profileError) return null;
  const profiles = new Map(
    ((profileData ?? []) as Array<Pick<ProfileRow, "user_id" | "username" | "display_name">>).map(
      (profile) => [profile.user_id, profile],
    ),
  );

  return accessRows.map((row) => ({
    userId: row.user_id,
    status: row.status,
    role: row.role,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    profile: profiles.get(row.user_id) ?? null,
  }));
}

