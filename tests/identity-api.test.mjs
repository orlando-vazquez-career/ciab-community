import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.CIAB_BASE_URL ?? "http://127.0.0.1:3000";

async function postJson(path, origin, payload) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify(payload),
  });
}

test("registro valida perfil, correo y confirmación antes de acceder a Supabase", async () => {
  const secret = "no-debe-aparecer-en-errores";
  const response = await postJson("/api/identity/register", baseUrl, {
    username: "x!",
    displayName: " ",
    email: "correo-invalido",
    password: secret,
    passwordConfirmation: "otra-clave",
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.fields.username);
  assert.ok(body.error.fields.displayName);
  assert.ok(body.error.fields.email);
  assert.ok(body.error.fields.passwordConfirmation);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(secret));
});

test("inicio de sesión rechaza datos incompletos sin consultar Auth", async () => {
  const response = await postJson("/api/identity/login", baseUrl, {
    email: "no-es-correo",
    password: "",
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.fields.email);
  assert.ok(body.error.fields.password);
});

test("registro válido falla cerrado cuando Supabase local no está habilitado", async () => {
  const response = await postJson("/api/identity/register", baseUrl, {
    username: "miembro_prueba",
    displayName: "Miembro de prueba",
    email: "miembro@example.test",
    password: "clave-solo-para-prueba",
    passwordConfirmation: "clave-solo-para-prueba",
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LOCAL_AUTH_UNAVAILABLE");
});

test("la API de identidad rechaza solicitudes de otro origen", async () => {
  const response = await postJson("/api/identity/register", "https://origen-ajeno.example", {
    username: "miembro_01",
    displayName: "Miembro de prueba",
    email: "miembro@example.test",
    password: "clave-de-prueba-segura",
    passwordConfirmation: "clave-de-prueba-segura",
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error.code, "ORIGIN_NOT_ALLOWED");
});
