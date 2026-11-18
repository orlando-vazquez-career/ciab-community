import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canReviewPosts } from "@/backend/identity/policy";
import { validateCommentModeration } from "@/backend/interactions/validation";
import { isForumUuid } from "@/backend/forum/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

type CommentModerationContext = { params: Promise<{ commentId: string }> };

export async function POST(request: Request, context: CommentModerationContext): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }
  const { commentId } = await context.params;
  if (!isForumUuid(commentId)) {
    return jsonError(400, "VALIDATION_ERROR", "El comentario indicado no es válido.");
  }
  const body = await readJsonBody(request, 4_096);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");
  const validation = validateCommentModeration(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa la acción y el motivo de moderación.", validation.fields);
  }
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "La moderación local no está habilitada.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para moderar comentarios.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (!canReviewPosts(current.identity)) {
      return jsonError(403, "NOT_AUTHORIZED", "Tu rol no permite moderar comentarios.");
    }

    const { error } = await supabase.rpc("moderate_comment", {
      p_comment_id: commentId,
      p_action: validation.value.action,
      p_reason: validation.value.reason,
    });
    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "Tu rol no permite moderar comentarios.");
    }
    if (error?.code === "22023") {
      return jsonError(400, "VALIDATION_ERROR", "La acción de moderación no es válida.");
    }
    if (error?.code === "P0002") {
      return jsonError(404, "NOT_FOUND", "El comentario ya tiene ese estado o no existe.");
    }
    if (error) return jsonError(503, "UPDATE_FAILED", "No se pudo actualizar el comentario.");
    return jsonSuccess({ moderated: true, action: validation.value.action });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo moderar el comentario local.");
  }
}
