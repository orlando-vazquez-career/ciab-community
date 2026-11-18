import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canCreateComment } from "@/backend/interactions/policy";
import { listPostComments } from "@/backend/interactions/comments";
import { validateCommentSubmission } from "@/backend/interactions/validation";
import { isForumUuid } from "@/backend/forum/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

type CommentsRouteContext = { params: Promise<{ postId: string }> };
const maxCommentBytes = 45_000;

export async function GET(_request: Request, context: CommentsRouteContext): Promise<Response> {
  const { postId } = await context.params;
  if (!isForumUuid(postId)) {
    return jsonError(400, "VALIDATION_ERROR", "La publicación indicada no es válida.");
  }
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "Los comentarios locales no están habilitados.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .eq("status", "published")
      .maybeSingle();
    if (postError) return jsonError(503, "READ_FAILED", "No se pudo consultar la publicación.");
    if (!post) return jsonError(404, "NOT_FOUND", "La publicación no está disponible.");

    const comments = await listPostComments(supabase, postId);
    if (!comments) return jsonError(503, "READ_FAILED", "No se pudieron cargar los comentarios.");
    return jsonSuccess({ comments });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar el foro local.");
  }
}

export async function POST(request: Request, context: CommentsRouteContext): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }
  const { postId } = await context.params;
  if (!isForumUuid(postId)) {
    return jsonError(400, "VALIDATION_ERROR", "La publicación indicada no es válida.");
  }

  const body = await readJsonBody(request, maxCommentBytes);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");
  const validation = validateCommentSubmission(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa el contenido del comentario.", validation.fields);
  }
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "Los comentarios locales no están habilitados.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para comentar.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (!canCreateComment(current.identity)) {
      return jsonError(403, "NOT_AUTHORIZED", "Solo los miembros activos pueden comentar.");
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        parent_id: validation.value.parentId,
        body: validation.value.body,
      })
      .select("id")
      .single();

    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "No se pudo autorizar el comentario.");
    }
    if (error?.code === "23503" || error?.code === "23514") {
      return jsonError(400, "VALIDATION_ERROR", "La publicación o respuesta indicada no está disponible.");
    }
    if (error || typeof data?.id !== "string") {
      return jsonError(503, "CREATE_FAILED", "No se pudo guardar el comentario.");
    }
    return jsonSuccess({ commentId: data.id, status: "published" }, 201);
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo guardar el comentario local.");
  }
}
