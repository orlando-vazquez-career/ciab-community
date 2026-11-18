import assert from "node:assert/strict";
import test from "node:test";

const validationModule = await import("../src/backend/interactions/validation.ts").catch(() => ({}));
const {
  validateCommentSubmission,
  validateReportSubmission,
  validateCommentModeration,
  validateReportResolution,
} = validationModule;

const parentId = "30000000-0000-4000-8000-000000000001";
const targetId = "40000000-0000-4000-8000-000000000001";

function validate(input) {
  return typeof validateCommentSubmission === "function"
    ? validateCommentSubmission(input)
    : undefined;
}

function validateReport(input) {
  return typeof validateReportSubmission === "function"
    ? validateReportSubmission(input)
    : undefined;
}

function validateCommentAction(input) {
  return typeof validateCommentModeration === "function"
    ? validateCommentModeration(input)
    : undefined;
}

function validateResolution(input) {
  return typeof validateReportResolution === "function"
    ? validateReportResolution(input)
    : undefined;
}

test("normaliza comentario y respuesta de un nivel", () => {
  assert.deepEqual(validate({ body: "  Aporte útil  ", parentId }), {
    valid: true,
    value: { body: "Aporte útil", parentId },
  });
  assert.deepEqual(validate({ body: "Comentario raíz" }), {
    valid: true,
    value: { body: "Comentario raíz", parentId: null },
  });
});

test("rechaza contenido vacío, excesivo o una respuesta con UUID inválido", () => {
  const empty = validate({ body: "   " });
  const oversized = validate({ body: "x".repeat(10_001) });
  const invalidParent = validate({ body: "Respuesta", parentId: "no-es-uuid" });

  assert.equal(empty?.valid, false);
  assert.equal(oversized?.valid, false);
  assert.equal(invalidParent?.valid, false);
  if (empty && !empty.valid) assert.ok(empty.fields.body);
  if (oversized && !oversized.valid) assert.ok(oversized.fields.body);
  if (invalidParent && !invalidParent.valid) assert.ok(invalidParent.fields.parentId);
});

test("normaliza un reporte dirigido a una publicación o comentario", () => {
  assert.deepEqual(validateReport({ postId: targetId, reason: "  Suplantación  " }), {
    valid: true,
    value: { postId: targetId, commentId: null, reason: "Suplantación" },
  });
  assert.deepEqual(validateReport({ commentId: parentId, reason: "Spam" }), {
    valid: true,
    value: { postId: null, commentId: parentId, reason: "Spam" },
  });
});

test("rechaza reportes sin objetivo único, con UUID inválido o motivo vacío", () => {
  const missingTarget = validateReport({ reason: "Motivo" });
  const multipleTargets = validateReport({ postId: targetId, commentId: parentId, reason: "Motivo" });
  const invalidTarget = validateReport({ postId: "no-es-uuid", reason: "Motivo" });
  const missingReason = validateReport({ postId: targetId, reason: " " });

  assert.equal(missingTarget?.valid, false);
  assert.equal(multipleTargets?.valid, false);
  assert.equal(invalidTarget?.valid, false);
  assert.equal(missingReason?.valid, false);
});

test("valida acciones auditadas de moderación de comentarios", () => {
  assert.deepEqual(validateCommentAction({ action: "hide", reason: "  Acoso  " }), {
    valid: true,
    value: { action: "hide", reason: "Acoso" },
  });
  assert.deepEqual(validateCommentAction({ action: "restore", reason: "Revisión completada" }), {
    valid: true,
    value: { action: "restore", reason: "Revisión completada" },
  });
  assert.equal(validateCommentAction({ action: "publish", reason: "Motivo" })?.valid, false);
  assert.equal(validateCommentAction({ action: "delete", reason: " " })?.valid, false);
});

test("valida resolución auditada de reportes abiertos", () => {
  assert.deepEqual(validateResolution({ status: "actioned", reason: "  Se ocultó el comentario  " }), {
    valid: true,
    value: { status: "actioned", reason: "Se ocultó el comentario" },
  });
  assert.equal(validateResolution({ status: "open", reason: "Motivo" })?.valid, false);
  assert.equal(validateResolution({ status: "dismissed", reason: " " })?.valid, false);
});
