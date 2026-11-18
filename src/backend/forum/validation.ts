export type PostKind = "news" | "discussion";
export type PostSourceClass = "primary" | "institutional" | "specialized_media" | "general_media";

export type PostSubmissionInput = {
  kind: PostKind;
  title: string;
  excerpt: string;
  body: string;
  sourceUrl: string | null;
  sourceClass: PostSourceClass | null;
  categoryId: string;
};

export type PostValidationResult =
  | { valid: true; value: PostSubmissionInput }
  | { valid: false; fields: Record<string, string> };

const categoryIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const sourceClasses: PostSourceClass[] = [
  "primary",
  "institutional",
  "specialized_media",
  "general_media",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function validatePostSubmission(input: unknown): PostValidationResult {
  const values = isRecord(input) ? input : {};
  const kind = readString(values.kind);
  const title = readString(values.title).trim();
  const excerpt = readString(values.excerpt).trim();
  const body = readString(values.body).trim();
  const sourceUrlInput = readString(values.sourceUrl).trim();
  const sourceClassInput = readString(values.sourceClass).trim();
  const categoryId = readString(values.categoryId).trim();
  const fields: Record<string, string> = {};

  if (kind !== "news" && kind !== "discussion") {
    fields.kind = "Selecciona noticia o debate.";
  }
  if (title.length < 1 || title.length > 200) {
    fields.title = "El título debe tener entre 1 y 200 caracteres.";
  }
  if (excerpt.length > 500) {
    fields.excerpt = "El contexto no puede superar los 500 caracteres.";
  }
  if (body.length < 1 || body.length > 50_000) {
    fields.body = "El contenido debe tener entre 1 y 50 000 caracteres.";
  }
  if (!categoryIdPattern.test(categoryId)) {
    fields.categoryId = "Selecciona una categoría válida.";
  }

  const sourceUrl = sourceUrlInput || null;
  if (sourceUrl && (sourceUrl.length > 2_048 || !isWebUrl(sourceUrl))) {
    fields.sourceUrl = "Ingresa una URL pública válida con protocolo HTTP o HTTPS.";
  }

  let sourceClass: PostSourceClass | null = null;
  if (sourceClassInput) {
    if (sourceClasses.includes(sourceClassInput as PostSourceClass)) {
      sourceClass = sourceClassInput as PostSourceClass;
    } else {
      fields.sourceClass = "Selecciona una clase de fuente válida.";
    }
  }

  if (kind === "news" && !sourceUrl) {
    fields.sourceUrl = "Las noticias requieren una fuente directa.";
  }
  if (kind === "news" && !sourceClass) {
    fields.sourceClass = "Las noticias requieren clasificar la fuente.";
  }
  if (!sourceUrl && sourceClass) {
    fields.sourceClass = "Indica una URL antes de clasificar la fuente.";
  }

  if (Object.keys(fields).length > 0) return { valid: false, fields };

  return {
    valid: true,
    value: {
      kind: kind as PostKind,
      title,
      excerpt,
      body,
      sourceUrl,
      sourceClass,
      categoryId,
    },
  };
}

export function isForumUuid(value: string): boolean {
  return categoryIdPattern.test(value);
}

export type PostReviewInput = {
  decision: "publish" | "reject";
  reason: string | null;
};

export type PostReviewValidationResult =
  | { valid: true; value: PostReviewInput }
  | { valid: false; fields: Record<string, string> };

export function validatePostReview(input: unknown): PostReviewValidationResult {
  const values = isRecord(input) ? input : {};
  const decision = readString(values.decision);
  const reasonInput = readString(values.reason).trim();
  const fields: Record<string, string> = {};

  if (decision !== "publish" && decision !== "reject") {
    fields.decision = "Selecciona publicar o rechazar.";
  }
  if (reasonInput.length > 500) {
    fields.reason = "El motivo no puede superar los 500 caracteres.";
  }
  if (decision === "reject" && reasonInput.length === 0) {
    fields.reason = "Indica el motivo del rechazo.";
  }

  if (Object.keys(fields).length > 0) return { valid: false, fields };
  return {
    valid: true,
    value: {
      decision: decision as PostReviewInput["decision"],
      reason: reasonInput || null,
    },
  };
}
