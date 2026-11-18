const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

type CommentSubmission = { body: string; parentId: string | null };
type CommentValidationResult =
  | { valid: true; value: CommentSubmission }
  | { valid: false; fields: Record<string, string> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateCommentSubmission(input: unknown): CommentValidationResult {
  const values = isRecord(input) ? input : {};
  const body = readString(values.body).trim();
  const parentIdInput = readString(values.parentId).trim();
  const fields: Record<string, string> = {};

  if (body.length < 1 || body.length > 10_000) {
    fields.body = "El comentario debe tener entre 1 y 10 000 caracteres.";
  }
  if (parentIdInput && !uuidPattern.test(parentIdInput)) {
    fields.parentId = "La respuesta indicada no es válida.";
  }
  if (Object.keys(fields).length) return { valid: false, fields };

  return {
    valid: true,
    value: { body, parentId: parentIdInput || null },
  };
}

type ReportSubmission = {
  postId: string | null;
  commentId: string | null;
  reason: string;
};

type ReportValidationResult =
  | { valid: true; value: ReportSubmission }
  | { valid: false; fields: Record<string, string> };

export function validateReportSubmission(input: unknown): ReportValidationResult {
  const values = isRecord(input) ? input : {};
  const postIdInput = readString(values.postId).trim();
  const commentIdInput = readString(values.commentId).trim();
  const reason = readString(values.reason).trim();
  const fields: Record<string, string> = {};

  if (Boolean(postIdInput) === Boolean(commentIdInput)) {
    fields.target = "Selecciona exactamente una publicación o un comentario.";
  }
  if (postIdInput && !uuidPattern.test(postIdInput)) {
    fields.postId = "La publicación indicada no es válida.";
  }
  if (commentIdInput && !uuidPattern.test(commentIdInput)) {
    fields.commentId = "El comentario indicado no es válido.";
  }
  if (reason.length < 1 || reason.length > 1000) {
    fields.reason = "El motivo debe tener entre 1 y 1000 caracteres.";
  }
  if (Object.keys(fields).length) return { valid: false, fields };

  return {
    valid: true,
    value: { postId: postIdInput || null, commentId: commentIdInput || null, reason },
  };
}

type CommentModeration = { action: "hide" | "delete" | "restore"; reason: string };
type CommentModerationValidationResult =
  | { valid: true; value: CommentModeration }
  | { valid: false; fields: Record<string, string> };

export function validateCommentModeration(input: unknown): CommentModerationValidationResult {
  const values = isRecord(input) ? input : {};
  const action = readString(values.action);
  const reason = readString(values.reason).trim();
  const fields: Record<string, string> = {};

  if (action !== "hide" && action !== "delete" && action !== "restore") {
    fields.action = "Selecciona ocultar, eliminar o restaurar.";
  }
  if (reason.length < 1 || reason.length > 500) {
    fields.reason = "El motivo debe tener entre 1 y 500 caracteres.";
  }
  if (Object.keys(fields).length) return { valid: false, fields };

  return { valid: true, value: { action: action as CommentModeration["action"], reason } };
}

type ReportResolution = { status: "reviewed" | "dismissed" | "actioned"; reason: string };
type ReportResolutionValidationResult =
  | { valid: true; value: ReportResolution }
  | { valid: false; fields: Record<string, string> };

export function validateReportResolution(input: unknown): ReportResolutionValidationResult {
  const values = isRecord(input) ? input : {};
  const status = readString(values.status);
  const reason = readString(values.reason).trim();
  const fields: Record<string, string> = {};

  if (status !== "reviewed" && status !== "dismissed" && status !== "actioned") {
    fields.status = "Selecciona revisar, descartar o tomar acción.";
  }
  if (reason.length < 1 || reason.length > 500) {
    fields.reason = "El motivo debe tener entre 1 y 500 caracteres.";
  }
  if (Object.keys(fields).length) return { valid: false, fields };

  return { valid: true, value: { status: status as ReportResolution["status"], reason } };
}
