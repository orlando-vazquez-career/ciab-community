import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.CIAB_BASE_URL ?? "http://127.0.0.1:3100";

test("la portada enlaza al acceso de miembros", async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes('href="/acceso"'), "debe existir el enlace de acceso");
});

test("el acceso en preparación no solicita ni envía credenciales", async () => {
  const response = await fetch(`${baseUrl}/acceso`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes('<main class="access-page">'), "debe aplicar los estilos de acceso");
  assert.match(html, /Acceso de miembros/);
  assert.match(html, /La autenticación y el registro todavía no están habilitados/);
  assert.match(html, /type="email"[^>]*disabled/);
  assert.match(html, /type="password"[^>]*disabled/);
  assert.match(html, /No escribas datos reales/);
  assert.doesNotMatch(html, /<form(?:\s|>)/i);
});

test("el acceso ofrece información del proceso de registro", async () => {
  const response = await fetch(`${baseUrl}/acceso`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes('href="/registro"'), "debe enlazar al proceso de registro");
});

test("el registro en preparación explica la membresía sin recopilar datos", async () => {
  const response = await fetch(`${baseUrl}/registro`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes("Registro de miembros"));
  assert.ok(html.includes("estado pendiente"));
  assert.ok(html.includes("membresía activa"));
  assert.ok(html.includes('href="/acceso"'), "debe ofrecer volver al acceso");
  assert.doesNotMatch(html, /<(?:form|input|textarea|select)(?:\s|>)/i);
  assert.match(html, /No escribas datos reales/);
});
