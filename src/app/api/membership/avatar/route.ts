import { randomUUID } from "node:crypto";
import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import {
  maxAvatarSizeBytes,
  validateAvatarImage,
} from "@/backend/identity/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

export async function POST(request: Request): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return jsonError(400, "VALIDATION_ERROR", "Selecciona un archivo de imagen.", {
      avatar: "El formato de la solicitud no es válido.",
    });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxAvatarSizeBytes + 16_384) {
    return jsonError(400, "VALIDATION_ERROR", "La imagen supera el límite de 5 MiB.", {
      avatar: "Elige una imagen de hasta 5 MiB.",
    });
  }

  const form = await request.formData().catch(() => null);
  const avatar = form?.get("avatar");
  if (typeof File === "undefined" || !(avatar instanceof File)) {
    return jsonError(400, "VALIDATION_ERROR", "Selecciona un archivo de imagen.", {
      avatar: "No se recibió un archivo válido.",
    });
  }

  const bytes = new Uint8Array(await avatar.arrayBuffer());
  if (!validateAvatarImage(avatar.type, avatar.size, bytes)) {
    return jsonError(400, "VALIDATION_ERROR", "El archivo debe ser PNG, JPEG o WebP de hasta 5 MiB.", {
      avatar: "Revisa el formato, contenido y tamaño de la imagen.",
    });
  }

  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "La autenticación local no está disponible.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para actualizar tu avatar.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar el perfil.");
    }
    if (!current.identity.profile) {
      return jsonError(404, "NOT_FOUND", "No se encontró el perfil de esta cuenta.");
    }

    const storage = supabase.storage.from("avatars");
    const avatarPath = `${current.identity.userId}/${randomUUID()}`;
    const { error: uploadError } = await storage.upload(avatarPath, avatar, {
      contentType: avatar.type,
      upsert: false,
    });
    if (uploadError) {
      return jsonError(503, "UPDATE_FAILED", "No se pudo guardar la imagen.");
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_path: avatarPath })
      .eq("user_id", current.identity.userId)
      .select("avatar_path")
      .maybeSingle();

    if (profileError || !data) {
      try {
        await storage.remove([avatarPath]);
      } catch {
        // La respuesta permanece genérica; un objeto huérfano no concede acceso.
      }
      return jsonError(503, "UPDATE_FAILED", "No se pudo actualizar el perfil.");
    }

    const previousPath = current.identity.profile.avatar_path;
    if (previousPath?.startsWith(`${current.identity.userId}/`)) {
      try {
        await storage.remove([previousPath]);
      } catch {
        // El perfil ya apunta al nuevo objeto; el objeto anterior puede limpiarse después.
      }
    }

    return jsonSuccess({ avatarPath: data.avatar_path });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo actualizar la imagen.");
  }
}
