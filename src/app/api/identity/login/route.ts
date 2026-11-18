import {
  jsonError,
  jsonSuccess,
  hasAllowedOrigin,
  readJsonBody,
} from "@/backend/identity/http";
import { validateLogin } from "@/backend/identity/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

export async function POST(request: Request): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");
  }

  const validation = validateLogin(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa los campos indicados.", validation.fields);
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
    const { data, error } = await supabase.auth.signInWithPassword(validation.value);

    if (error || !data.user) {
      return jsonError(401, "AUTHENTICATION_FAILED", "Correo o contraseña incorrectos.");
    }

    const { data: access, error: accessError } = await supabase
      .from("member_access")
      .select("status, role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (accessError || !access) {
      await supabase.auth.signOut();
      return jsonError(
        503,
        "LOCAL_AUTH_UNAVAILABLE",
        "No se pudo comprobar el estado de la membresía. Inténtalo más tarde.",
      );
    }

    return jsonSuccess({ status: access.status, role: access.role });
  } catch {
    return jsonError(
      503,
      "LOCAL_AUTH_UNAVAILABLE",
      "La autenticación local no está disponible. Comprueba la configuración y vuelve a intentar.",
    );
  }
}
