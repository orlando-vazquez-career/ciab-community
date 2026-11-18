import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.CIAB_BASE_URL ?? "http://127.0.0.1:3000";

async function patchJson(path, payload) {
  return fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify(payload),
  });
}

test("el perfil valida username, nombre visible y límite de biografía", async () => {
  const response = await patchJson("/api/membership/profile", {
    username: "@@",
    displayName: " ",
    bio: "x".repeat(501),
  });
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.fields.username);
  assert.ok(body.error.fields.displayName);
  assert.ok(body.error.fields.bio);
});

test("el perfil válido falla cerrado sin Supabase local", async () => {
  const response = await patchJson("/api/membership/profile", {
    username: "miembro_prueba",
    displayName: "Miembro de prueba",
    bio: "Perfil de prueba local",
  });
  assert.equal(response.status, 503);

  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("la carga de avatar rechaza SVG", async () => {
  const form = new FormData();
  form.append("avatar", new Blob(["<svg></svg>"], { type: "image/svg+xml" }), "avatar.svg");
  const response = await fetch(`${baseUrl}/api/membership/avatar`, {
    method: "POST",
    headers: { accept: "application/json", origin: baseUrl },
    body: form,
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("la carga con firma PNG permitida falla cerrada sin Supabase local", async () => {
  const form = new FormData();
  form.append(
    "avatar",
    new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
      type: "image/png",
    }),
    "avatar.png",
  );
  const response = await fetch(`${baseUrl}/api/membership/avatar`, {
    method: "POST",
    headers: { accept: "application/json", origin: baseUrl },
    body: form,
  });

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("la carga de avatar rechaza orígenes externos", async () => {
  const form = new FormData();
  const response = await fetch(`${baseUrl}/api/membership/avatar`, {
    method: "POST",
    headers: { accept: "application/json", origin: "https://example.invalid" },
    body: form,
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error.code, "ORIGIN_NOT_ALLOWED");
});

test("la API de membresías rechaza identificadores de miembro inválidos", async () => {
  const response = await patchJson("/api/membership/members/no-es-uuid", {
    action: "approve",
    reason: "Revisión de prueba",
  });
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
});
