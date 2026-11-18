import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getLocalSupabaseConfiguration } from "./config";

export class LocalAuthUnavailableError extends Error {
  constructor() {
    super("La autenticación local no está habilitada o su configuración no es segura.");
    this.name = "LocalAuthUnavailableError";
  }
}

export async function createSupabaseServerClient() {
  const result = getLocalSupabaseConfiguration();
  if (!result.available) throw new LocalAuthUnavailableError();

  const cookieStore = await cookies();
  const secure = new URL(result.config.siteUrl).protocol === "https:";

  return createServerClient(result.config.url, result.config.anonKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components no escriben cookies; src/proxy.ts actualiza la sesión.
        }
      },
    },
  });
}
