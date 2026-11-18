import { jsonError, jsonSuccess, hasAllowedOrigin } from "@/backend/identity/http";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

export async function POST(request: Request): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(
      503,
      "LOCAL_AUTH_UNAVAILABLE",
      "La autenticación local no está habilitada o su configuración no es segura.",
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo cerrar la sesión local.");
    }
    return jsonSuccess({ signedOut: true });
  } catch {
    return jsonError(
      503,
      "LOCAL_AUTH_UNAVAILABLE",
      "La autenticación local no está disponible.",
    );
  }
}
