import {
  hasAllowedOrigin,
  jsonError,
  jsonSuccess,
  readJsonBody,
} from "@/backend/identity/http";
import { getCurrentIdentity } from "@/backend/identity/membership";
import { canManageMemberships, canManageRoles } from "@/backend/identity/policy";
import { validateMembershipAction } from "@/backend/identity/validation";
import { getLocalSupabaseConfiguration } from "@/backend/supabase/config";
import { createSupabaseServerClient } from "@/backend/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

type MemberRouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(
  request: Request,
  context: MemberRouteContext,
): Promise<Response> {
  if (!hasAllowedOrigin(request)) {
    return jsonError(403, "ORIGIN_NOT_ALLOWED", "No se aceptó el origen de la solicitud.");
  }

  const { userId } = await context.params;
  if (!uuidPattern.test(userId)) {
    return jsonError(400, "VALIDATION_ERROR", "El identificador de miembro no es válido.");
  }

  const body = await readJsonBody(request);
  if (body === null) return jsonError(400, "INVALID_JSON", "No se pudo leer la solicitud.");

  const validation = validateMembershipAction(body);
  if (!validation.valid) {
    return jsonError(400, "VALIDATION_ERROR", "Revisa la acción solicitada.", validation.fields);
  }

  if (!getLocalSupabaseConfiguration().available) {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "La autenticación local no está disponible.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const current = await getCurrentIdentity(supabase);
    if (current.kind === "anonymous") {
      return jsonError(401, "NOT_AUTHENTICATED", "Inicia sesión para gestionar membresías.");
    }
    if (current.kind === "unavailable") {
      return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo consultar la membresía.");
    }
    if (!canManageMemberships(current.identity) || current.identity.userId === userId) {
      return jsonError(403, "NOT_AUTHORIZED", "No tienes permiso para esta acción.");
    }
    if (
      validation.value.action === "change_role" &&
      !canManageRoles(current.identity)
    ) {
      return jsonError(403, "NOT_AUTHORIZED", "Solo un superadmin puede cambiar roles.");
    }

    let functionName: "approve_member" | "suspend_member" | "set_member_role";
    let arguments_: Record<string, string | null>;
    if (validation.value.action === "approve") {
      functionName = "approve_member";
      arguments_ = { p_user_id: userId, p_reason: validation.value.reason || null };
    } else if (validation.value.action === "suspend") {
      functionName = "suspend_member";
      arguments_ = { p_user_id: userId, p_reason: validation.value.reason };
    } else {
      functionName = "set_member_role";
      arguments_ = {
        p_user_id: userId,
        p_role: validation.value.role ?? null,
        p_reason: validation.value.reason,
      };
    }

    const { error } = await supabase.rpc(functionName, arguments_);
    if (error?.code === "42501") {
      return jsonError(403, "NOT_AUTHORIZED", "No tienes permiso para esta acción.");
    }
    if (error?.code === "P0002" || error?.code === "23514") {
      return jsonError(409, "UPDATE_FAILED", "La membresía cambió o no admite esta acción.");
    }
    if (error) {
      return jsonError(503, "UPDATE_FAILED", "No se pudo actualizar la membresía.");
    }

    return jsonSuccess({ updated: true });
  } catch {
    return jsonError(503, "LOCAL_AUTH_UNAVAILABLE", "No se pudo actualizar la membresía.");
  }
}
