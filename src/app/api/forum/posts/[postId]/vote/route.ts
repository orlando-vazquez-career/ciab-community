import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canVoteOnPost } from "@/backend/interactions/policy";
import { isForumUuid } from "@/backend/forum/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

type VoteRouteContext = { params: Promise<{ postId: string }> };

export async function POST(request: Request, context: VoteRouteContext): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }
  const { postId } = await context.params;
  if (!isForumUuid(postId)) {
    return jsonError(400, "VALIDATION_ERROR", "La publicación indicada no es válida.");
  }
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "Los votos locales no están habilitados.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para votar.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (current.identity.status !== "active") {
      return jsonError(403, "NOT_AUTHORIZED", "Solo los miembros activos pueden votar.");
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .eq("status", "published")
      .maybeSingle();
    if (postError) return jsonError(503, "READ_FAILED", "No se pudo consultar la publicación.");
    if (!post) return jsonError(404, "NOT_FOUND", "La publicación no está disponible.");
    if (!canVoteOnPost(current.identity, post.author_id)) {
      return jsonError(403, "NOT_AUTHORIZED", "No puedes votar tu propia publicación.");
    }

    const { error } = await supabase.from("post_votes").insert({ post_id: postId, value: 1 });
    if (error?.code === "23505") {
      return jsonError(409, "VALIDATION_ERROR", "Tu voto positivo ya fue registrado y no se puede cambiar.");
    }
    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "No se pudo autorizar el voto.");
    }
    if (error) return jsonError(503, "CREATE_FAILED", "No se pudo registrar el voto.");
    return jsonSuccess({ voted: true }, 201);
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo registrar el voto local.");
  }
}
