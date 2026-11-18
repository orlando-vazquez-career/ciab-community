export type LocalSupabaseConfiguration = {
  url: string;
  anonKey: string;
  siteUrl: string;
};

export type LocalSupabaseConfigurationResult =
  | { available: true; config: LocalSupabaseConfiguration }
  | { available: false; reason: "disabled" | "incomplete" | "not_local" | "privileged_key" };

function parseLoopbackUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (
      !loopbackHosts.has(url.hostname) ||
      !["http:", "https:"].includes(url.protocol) ||
      url.username !== "" ||
      url.password !== "" ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isPrivilegedKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;

  const payload = key.split(".")[1];
  if (!payload) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown;
    };
    return decoded.role === "service_role";
  } catch {
    return false;
  }
}

export function getLocalSupabaseConfiguration(): LocalSupabaseConfigurationResult {
  if (process.env.CIAB_LOCAL_AUTH_ENABLED !== "true") {
    return { available: false, reason: "disabled" };
  }

  const urlValue = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const siteUrlValue = process.env.CIAB_LOCAL_SITE_URL?.trim() || "http://127.0.0.1:3000";

  if (!urlValue || !anonKey) {
    return { available: false, reason: "incomplete" };
  }

  const url = parseLoopbackUrl(urlValue);
  const siteUrl = parseLoopbackUrl(siteUrlValue);
  if (!url || !siteUrl) {
    return { available: false, reason: "not_local" };
  }
  if (isPrivilegedKey(anonKey)) {
    return { available: false, reason: "privileged_key" };
  }

  return {
    available: true,
    config: { url: url.origin, anonKey, siteUrl: siteUrl.origin },
  };
}
