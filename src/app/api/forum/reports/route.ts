import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canReportContent } from "@/backend/interactions/policy";
import { validateReportSubmission } from "@/backend/interactions/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

export async function POST(request: Request): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }
  const body = await readJsonBody(request, 8_000);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");
  const validation = validateReportSubmission(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa el objetivo y el motivo del reporte.", validation.fields);
  }
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "Los reportes locales no están habilitados.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para reportar contenido.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (!canReportContent(current.identity)) {
      return jsonError(403, "NOT_AUTHORIZED", "Solo los miembros activos pueden reportar contenido.");
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        post_id: validation.value.postId,
        comment_id: validation.value.commentId,
        reason: validation.value.reason,
      })
      .select("id")
      .single();
    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "No se pudo autorizar el reporte.");
    }
    if (error?.code === "23503" || error?.code === "23514") {
      return jsonError(400, "VALIDATION_ERROR", "El contenido reportado ya no está disponible.");
    }
    if (error || typeof data?.id !== "string") {
      return jsonError(503, "CREATE_FAILED", "No se pudo registrar el reporte.");
    }
    return jsonSuccess({ reportId: data.id, status: "open" }, 201);
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo registrar el reporte local.");
  }
}
