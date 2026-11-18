import assert from "node:assert/strict";
import test from "node:test";

const { validateAvatarImage } = await import("../src/backend/identity/validation.ts");

const pngSignature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function validate(type, size, bytes) {
  return typeof validateAvatarImage === "function"
    ? validateAvatarImage(type, size, bytes)
    : undefined;
}

test("acepta PNG con firma válida dentro del límite", () => {
  assert.equal(validate("image/png", pngSignature.length, pngSignature), true);
});

test("rechaza SVG aunque declare un tipo de imagen", () => {
  assert.equal(validate("image/svg+xml", 11, new TextEncoder().encode("<svg></svg>")), false);
});

test("rechaza MIME permitido con firma incompatible", () => {
  assert.equal(validate("image/png", 8, new TextEncoder().encode("not-image")), false);
});

test("rechaza imágenes superiores a 5 MiB", () => {
  assert.equal(validate("image/png", 5 * 1024 * 1024 + 1, pngSignature), false);
});

test("reconoce JPEG y WebP según su firma binaria", () => {
  assert.equal(validate("image/jpeg", 3, Uint8Array.from([0xff, 0xd8, 0xff])), true);
  assert.equal(
    validate("image/webp", 12, Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    true,
  );
});
