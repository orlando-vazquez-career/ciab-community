import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canReviewPosts } from "@/backend/identity/policy";
import { validateReportResolution } from "@/backend/interactions/validation";
import { isForumUuid } from "@/backend/forum/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

type ReportResolutionContext = { params: Promise<{ reportId: string }> };

export async function POST(request: Request, context: ReportResolutionContext): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }
  const { reportId } = await context.params;
  if (!isForumUuid(reportId)) {
    return jsonError(400, "VALIDATION_ERROR", "El reporte indicado no es válido.");
  }
  const body = await readJsonBody(request, 4_096);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");
  const validation = validateReportResolution(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa la resolución y el motivo.", validation.fields);
  }
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "La resolución de reportes no está habilitada.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para resolver reportes.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (!canReviewPosts(current.identity)) {
      return jsonError(403, "NOT_AUTHORIZED", "Tu rol no permite resolver reportes.");
    }

    const { error } = await supabase.rpc("resolve_report", {
      p_report_id: reportId,
      p_status: validation.value.status,
      p_reason: validation.value.reason,
    });
    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "Tu rol no permite resolver reportes.");
    }
    if (error?.code === "22023") {
      return jsonError(400, "VALIDATION_ERROR", "La resolución de reporte no es válida.");
    }
    if (error?.code === "P0002") {
      return jsonError(404, "NOT_FOUND", "El reporte ya fue resuelto o no existe.");
    }
    if (error) return jsonError(503, "UPDATE_FAILED", "No se pudo resolver el reporte.");
    return jsonSuccess({ resolved: true, status: validation.value.status });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo resolver el reporte local.");
  }
}
