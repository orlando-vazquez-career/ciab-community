import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.CIAB_BASE_URL ?? "http://127.0.0.1:3000";

test("la portada enlaza al acceso de miembros", async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes('href="/acceso"'), "debe existir el enlace de acceso");
});

test("el acceso permite iniciar sesión con correo y contraseña", async () => {
  const response = await fetch(`${baseUrl}/acceso`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<main\b[^>]*class="access-page"[^>]*>/, "debe aplicar los estilos de acceso");
  assert.match(html, /Acceso de miembros/);
  assert.match(html, /<form(?:\s|>)/i);
  assert.match(html, /name="email"/);
  assert.match(html, /type="email"/);
  assert.match(html, /name="password"/);
  assert.match(html, /type="password"/);
  assert.doesNotMatch(html, /<input[^>]*disabled/);
  assert.match(html, /Iniciar sesión/);
});

test("el acceso ofrece información del proceso de registro", async () => {
  const response = await fetch(`${baseUrl}/acceso`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes('href="/registro"'), "debe enlazar al proceso de registro");
});

test("el registro solicita los datos de identidad y confirma la membresía pendiente", async () => {
  const response = await fetch(`${baseUrl}/registro`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes("Registro de miembros"));
  assert.match(html, /name="username"/);
  assert.match(html, /name="displayName"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="password"/);
  assert.match(html, /name="passwordConfirmation"/);
  assert.match(html, /type="submit"/);
  assert.match(html, /estado pendiente/i);
  assert.ok(html.includes("membresía activa"));
  assert.ok(html.includes('href="/acceso"'), "debe ofrecer volver al acceso");
  assert.match(html, /<form(?:\s|>)/i);
});
