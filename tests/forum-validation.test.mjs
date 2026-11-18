import assert from "node:assert/strict";
import test from "node:test";

const validationModule = await import("../src/backend/forum/validation.ts").catch(() => ({}));
const { validatePostSubmission, validatePostReview } = validationModule;

const categoryId = "20000000-0000-4000-8000-000000000001";
const validNews = {
  kind: "news",
  title: "  Un avance en inteligencia artificial  ",
  excerpt: "Contexto breve para la comunidad.",
  body: "Descripción completa del hallazgo.",
  sourceUrl: "https://example.org/research",
  sourceClass: "primary",
  categoryId,
};

function validate(input) {
  return typeof validatePostSubmission === "function"
    ? validatePostSubmission(input)
    : undefined;
}

function validateReview(input) {
  return typeof validatePostReview === "function" ? validatePostReview(input) : undefined;
}

test("normaliza y acepta una noticia con fuente y categoría válidas", () => {
  assert.deepEqual(validate(validNews), {
    valid: true,
    value: {
      kind: "news",
      title: "Un avance en inteligencia artificial",
      excerpt: "Contexto breve para la comunidad.",
      body: "Descripción completa del hallazgo.",
      sourceUrl: "https://example.org/research",
      sourceClass: "primary",
      categoryId,
    },
  });
});

test("acepta un debate sin fuente", () => {
  const result = validate({
    ...validNews,
    kind: "discussion",
    sourceUrl: "",
    sourceClass: "",
  });
  assert.equal(result?.valid, true);
  if (result?.valid) {
    assert.equal(result.value.sourceUrl, null);
    assert.equal(result.value.sourceClass, null);
  }
});

test("exige fuente y clase de fuente para noticias", () => {
  const result = validate({ ...validNews, sourceUrl: "", sourceClass: "" });
  assert.equal(result?.valid, false);
  if (result && !result.valid) {
    assert.ok(result.fields.sourceUrl);
    assert.ok(result.fields.sourceClass);
  }
});

test("rechaza URL no HTTP, categoría inválida y contenido fuera de límites", () => {
  const result = validate({
    ...validNews,
    sourceUrl: "javascript:alert(1)",
    categoryId: "no-es-uuid",
    body: "x".repeat(50_001),
  });
  assert.equal(result?.valid, false);
  if (result && !result.valid) {
    assert.ok(result.fields.sourceUrl);
    assert.ok(result.fields.categoryId);
    assert.ok(result.fields.body);
  }
});

test("rechaza fuentes demasiado largas o con credenciales incrustadas", () => {
  const longUrl = validate({ ...validNews, sourceUrl: `https://example.org/${"a".repeat(2_048)}` });
  const credentialUrl = validate({ ...validNews, sourceUrl: "https://usuario:clave@example.org/noticia" });
  assert.equal(longUrl?.valid, false);
  assert.equal(credentialUrl?.valid, false);
  if (longUrl && !longUrl.valid) assert.ok(longUrl.fields.sourceUrl);
  if (credentialUrl && !credentialUrl.valid) assert.ok(credentialUrl.fields.sourceUrl);
});

test("permite publicar y exige motivo para rechazar una publicación", () => {
  assert.deepEqual(validateReview({ decision: "publish", reason: "" }), {
    valid: true,
    value: { decision: "publish", reason: null },
  });
  assert.deepEqual(validateReview({ decision: "reject", reason: "  Falta evidencia  " }), {
    valid: true,
    value: { decision: "reject", reason: "Falta evidencia" },
  });
  const invalid = validateReview({ decision: "reject", reason: " " });
  assert.equal(invalid?.valid, false);
  if (invalid && !invalid.valid) assert.ok(invalid.fields.reason);
});
