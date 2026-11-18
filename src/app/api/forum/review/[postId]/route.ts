import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canReviewPosts } from "@/backend/identity/policy";
import { isForumUuid, validatePostReview } from "@/backend/forum/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

type ReviewRouteContext = { params: Promise<{ postId: string }> };

export async function POST(request: Request, context: ReviewRouteContext): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }

  const { postId } = await context.params;
  if (!isForumUuid(postId)) {
    return jsonError(400, "VALIDATION_ERROR", "La publicación indicada no es válida.");
  }

  const body = await readJsonBody(request);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");

  const validation = validatePostReview(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa la decisión de moderación.", validation.fields);
  }

  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "La revisión local no está habilitada.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para revisar publicaciones.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (!canReviewPosts(current.identity)) {
      return jsonError(403, "NOT_AUTHORIZED", "Tu rol no permite revisar publicaciones.");
    }

    const { error } = await supabase.rpc("review_post", {
      p_post_id: postId,
      p_decision: validation.value.decision,
      p_reason: validation.value.reason,
    });

    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "Tu rol no permite revisar publicaciones.");
    }
    if (error?.code === "22023") {
      return jsonError(400, "VALIDATION_ERROR", "La decisión de moderación no es válida.");
    }
    if (error?.code === "P0002") {
      return jsonError(404, "NOT_FOUND", "La publicación ya no está pendiente de revisión.");
    }
    if (error) {
      return jsonError(503, "REVIEW_FAILED", "No se pudo completar la revisión.");
    }

    return jsonSuccess({ reviewed: true, decision: validation.value.decision });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo completar la revisión local.");
  }
}
