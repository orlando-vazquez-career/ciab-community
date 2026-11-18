import {
  jsonError,
  jsonSuccess,
  hasAllowedOrigin,
  readJsonBody,
} from "@/backend/identity/http";
import { validateRegistration } from "@/backend/identity/validation";
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

  const validation = validateRegistration(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa los campos indicados.", validation.fields);
  }

  const configuration = getLocalSupabaseConfiguration();
  if (!configuration.available) {
    return jsonError(
      503,
      "LOCAL_AUTH_UNAVAILABLE",
      "La autenticación local no está habilitada o su configuración no es segura.",
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: validation.value.email,
      password: validation.value.password,
      options: {
        data: {
          username: validation.value.username,
          display_name: validation.value.displayName,
        },
        emailRedirectTo: new URL("/auth/callback", configuration.config.siteUrl).toString(),
      },
    });

    if (error) {
      const status = error.status === 429 ? 429 : 400;
      return jsonError(
        status,
        "AUTHENTICATION_FAILED",
        "No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.",
      );
    }

    const confirmationRequired = !data.session;
    return jsonSuccess(
      {
        confirmationRequired,
        message: confirmationRequired
          ? "Si el registro puede continuar, recibirás un correo para confirmar la cuenta. Después, la membresía quedará pendiente de revisión."
          : "La cuenta fue creada. Tu membresía comienza pendiente de revisión.",
      },
      201,
    );
  } catch {
    return jsonError(
      503,
      "LOCAL_AUTH_UNAVAILABLE",
      "La autenticación local no está disponible. Comprueba la configuración y vuelve a intentar.",
    );
  }
}
