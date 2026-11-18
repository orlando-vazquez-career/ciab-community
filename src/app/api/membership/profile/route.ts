import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { validateProfileUpdate } from "@/backend/identity/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

export async function PATCH(request: Request): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }

  const body = await readJsonBody(request);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");

  const validation = validateProfileUpdate(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa los campos indicados.", validation.fields);
  }

  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "La autenticación local no está disponible.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para editar tu perfil.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar el perfil.");
    }
    if (!current.identity.profile) {
      return jsonError(404, "NOT_FOUND", "No se encontró el perfil de esta cuenta.");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        username: validation.value.username,
        display_name: validation.value.displayName,
        bio: validation.value.bio,
      })
      .eq("user_id", current.identity.userId)
      .select("username, display_name, bio, avatar_path")
      .maybeSingle();

    if (error?.code === "23505") {
      return jsonError(409, "UPDATE_FAILED", "Ese nombre de usuario ya está ocupado.", {
        username: "Elige otro nombre de usuario.",
      });
    }
    if (error || !data) {
      return jsonError(503, "UPDATE_FAILED", "No se pudo guardar el perfil.");
    }

    return jsonSuccess({ profile: data });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo guardar el perfil.");
  }
}
