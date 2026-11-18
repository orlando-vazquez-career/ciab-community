import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.CIAB_BASE_URL ?? "http://127.0.0.1:3000";
const categoryId = "20000000-0000-4000-8000-000000000001";

async function postSubmission(payload, origin = baseUrl) {
  return fetch(`${baseUrl}/api/forum/posts`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify(payload),
  });
}

const validDiscussion = {
  kind: "discussion",
  title: "Una pregunta sobre IA",
  excerpt: "Contexto para iniciar el intercambio.",
  body: "¿Cómo están evaluando este enfoque?",
  sourceUrl: "",
  sourceClass: "",
  categoryId,
};

test("el feed público falla cerrado si Supabase local está deshabilitado", async () => {
  const response = await fetch(`${baseUrl}/api/forum/posts`, {
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("la API de publicaciones valida el contenido antes de acceder a Supabase", async () => {
  const response = await postSubmission({ ...validDiscussion, title: " " });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.fields.title);
});

test("una publicación válida falla cerrado sin Supabase local", async () => {
  const response = await postSubmission(validDiscussion);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("una publicación válida con contenido extenso falla cerrado sin Supabase local", async () => {
  const response = await postSubmission({
    ...validDiscussion,
    body: "Contenido de discusión. ".repeat(1_000),
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("la revisión valida UUID y decisión antes de acceder a Supabase", async () => {
  const invalidId = await fetch(`${baseUrl}/api/forum/review/not-a-uuid`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ decision: "publish" }),
  });
  assert.equal(invalidId.status, 400);

  const invalidDecision = await fetch(`${baseUrl}/api/forum/review/${categoryId}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ decision: "ignore" }),
  });
  assert.equal(invalidDecision.status, 400);
});

test("una revisión válida falla cerrada sin Supabase local", async () => {
  const response = await fetch(`${baseUrl}/api/forum/review/${categoryId}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ decision: "publish", reason: "" }),
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("la creación de publicaciones rechaza orígenes externos", async () => {
  const response = await postSubmission(validDiscussion, "https://example.invalid");
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error.code, "ORIGIN_NOT_ALLOWED");
});
