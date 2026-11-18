import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { listActiveCategories, listPublishedPosts } from "@/backend/forum/posts";
import { isForumUuid, validatePostSubmission } from "@/backend/forum/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

const maxSubmissionBytes = 220_000;

export async function GET(request: Request): Promise<Response> {
  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "El foro local no está habilitado.");
  }

  const url = new URL(request.url);
  const pageValue = url.searchParams.get("page") ?? "1";
  const page = Number(pageValue);
  const categoryId = url.searchParams.get("categoryId") || undefined;
  if (!Number.isInteger(page) || page < 1 || page > 1000) {
    return jsonError(400, "VALIDATION_ERROR", "El número de página no es válido.");
  }
  if (categoryId && !isForumUuid(categoryId)) {
    return jsonError(400, "VALIDATION_ERROR", "La categoría indicada no es válida.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [categories, feed] = await Promise.all([
      listActiveCategories(supabase),
      listPublishedPosts(supabase, { page, categoryId }),
    ]);
    if (!categories || !feed) {
      return jsonError(503, "READ_FAILED", "No se pudo cargar el foro local.");
    }
    return jsonSuccess({ categories, ...feed });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo conectar con el foro local.");
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }

  const body = await readJsonBody(request, maxSubmissionBytes);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");

  const validation = validatePostSubmission(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa los campos indicados.", validation.fields);
  }

  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "El foro local no está habilitado.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para enviar una publicación.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (current.identity.status !== "active") {
      return jsonError(403, "NOT_AUTHORIZED", "Solo los miembros activos pueden publicar.");
    }

    const { data, error } = await supabase.rpc("submit_post", {
      p_kind: validation.value.kind,
      p_title: validation.value.title,
      p_excerpt: validation.value.excerpt,
      p_body_md: validation.value.body,
      p_source_url: validation.value.sourceUrl,
      p_source_class: validation.value.sourceClass,
      p_category_id: validation.value.categoryId,
    });

    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "La membresía no permite enviar publicaciones.");
    }
    if (error?.code === "22023") {
      return jsonError(400, "VALIDATION_ERROR", "Revisa la fuente y la categoría seleccionadas.");
    }
    if (error || typeof data !== "string") {
      return jsonError(503, "CREATE_FAILED", "No se pudo enviar la publicación a revisión.");
    }

    return jsonSuccess({ postId: data, status: "pending_review" }, 201);
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo enviar la publicación a revisión.");
  }
}
