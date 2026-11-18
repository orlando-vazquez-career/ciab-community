import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.CIAB_BASE_URL ?? "http://127.0.0.1:3000";
const postId = "20000000-0000-4000-8000-000000000003";
const commentId = "30000000-0000-4000-8000-000000000003";
const reportId = "40000000-0000-4000-8000-000000000003";

async function requestComments(method, payload, pathId = postId, origin = baseUrl) {
  return fetch(`${baseUrl}/api/forum/posts/${pathId}/comments`, {
    method,
    headers: {
      accept: "application/json",
      origin,
      ...(payload ? { "content-type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}

async function requestJson(path, payload, origin = baseUrl) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { accept: "application/json", origin, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

test("el feed de comentarios falla cerrado sin Supabase local", async () => {
  const response = await requestComments("GET");
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("crear comentario valida origen, UUID y contenido antes de requerir Supabase", async () => {
  const crossOrigin = await requestComments("POST", { body: "Comentario válido" }, postId, "https://example.invalid");
  assert.equal(crossOrigin.status, 403);

  const invalidId = await requestComments("POST", { body: "Comentario válido" }, "no-es-uuid");
  assert.equal(invalidId.status, 400);

  const invalidBody = await requestComments("POST", { body: "   " });
  assert.equal(invalidBody.status, 400);
  const invalid = await invalidBody.json();
  assert.equal(invalid.error.code, "VALIDATION_ERROR");
});

test("un comentario válido falla cerrado cuando Supabase local está apagado", async () => {
  const response = await requestComments("POST", { body: "Comentario válido" });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("el voto positivo rechaza origen externo e identificador inválido", async () => {
  const crossOrigin = await requestJson(`/api/forum/posts/${postId}/vote`, {}, "https://example.invalid");
  assert.equal(crossOrigin.status, 403);
  const invalidId = await requestJson("/api/forum/posts/no-es-uuid/vote", {});
  assert.equal(invalidId.status, 400);
});

test("un voto con formato válido falla cerrado cuando Supabase está apagado", async () => {
  const response = await requestJson(`/api/forum/posts/${postId}/vote`, {});
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("reportar exige exactamente un objetivo válido y falla cerrado al guardar", async () => {
  const invalid = await requestJson("/api/forum/reports", { postId, commentId, reason: "Motivo" });
  assert.equal(invalid.status, 400);
  const crossOrigin = await requestJson("/api/forum/reports", { postId, reason: "Motivo" }, "https://example.invalid");
  assert.equal(crossOrigin.status, 403);
  const valid = await requestJson("/api/forum/reports", { postId, reason: "Motivo" });
  assert.equal(valid.status, 503);
});

test("moderar comentario valida acción e identificador antes de exigir Supabase", async () => {
  const invalidId = await requestJson("/api/forum/comments/no-es-uuid/moderate", { action: "hide", reason: "Motivo" });
  assert.equal(invalidId.status, 400);
  const invalidAction = await requestJson(`/api/forum/comments/${commentId}/moderate`, { action: "restore-now", reason: "Motivo" });
  assert.equal(invalidAction.status, 400);
  const valid = await requestJson(`/api/forum/comments/${commentId}/moderate`, { action: "hide", reason: "Motivo" });
  assert.equal(valid.status, 503);
});

test("resolver reporte valida estado e identificador antes de exigir Supabase", async () => {
  const invalidId = await requestJson("/api/forum/reports/no-es-uuid/resolve", { status: "reviewed", reason: "Motivo" });
  assert.equal(invalidId.status, 400);
  const invalidStatus = await requestJson(`/api/forum/reports/${reportId}/resolve`, { status: "open", reason: "Motivo" });
  assert.equal(invalidStatus.status, 400);
  const valid = await requestJson(`/api/forum/reports/${reportId}/resolve`, { status: "reviewed", reason: "Motivo" });
  assert.equal(valid.status, 503);
});
