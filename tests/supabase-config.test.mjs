import assert from "node:assert/strict";
import test from "node:test";
import { getLocalSupabaseConfiguration } from "../src/backend/supabase/config.ts";

const keys = [
  "CIAB_LOCAL_AUTH_ENABLED",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "CIAB_LOCAL_SITE_URL",
];

function withEnvironment(values, callback) {
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, values);
  try {
    callback();
  } finally {
    for (const key of keys) {
      if (previous.get(key) === undefined) delete process.env[key];
      else process.env[key] = previous.get(key);
    }
  }
}

test("la autenticación local permanece apagada por defecto", () => {
  withEnvironment(
    { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_ANON_KEY: "clave-publica-local" },
    () => assert.deepEqual(getLocalSupabaseConfiguration(), { available: false, reason: "disabled" }),
  );
});

test("acepta URLs de loopback solo con activación explícita", () => {
  withEnvironment(
    {
      CIAB_LOCAL_AUTH_ENABLED: "true",
      SUPABASE_URL: "http://127.0.0.1:54321/",
      SUPABASE_ANON_KEY: "clave-publica-local",
      CIAB_LOCAL_SITE_URL: "http://localhost:3000/",
    },
    () => {
      const result = getLocalSupabaseConfiguration();
      assert.equal(result.available, true);
      if (result.available) {
        assert.equal(result.config.url, "http://127.0.0.1:54321");
        assert.equal(result.config.siteUrl, "http://localhost:3000");
      }
    },
  );
});

test("rechaza URLs de Supabase o del sitio fuera de loopback", () => {
  withEnvironment(
    {
      CIAB_LOCAL_AUTH_ENABLED: "true",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "clave-publica-local",
    },
    () => assert.deepEqual(getLocalSupabaseConfiguration(), { available: false, reason: "not_local" }),
  );
  withEnvironment(
    {
      CIAB_LOCAL_AUTH_ENABLED: "true",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "clave-publica-local",
      CIAB_LOCAL_SITE_URL: "https://community.example",
    },
    () => assert.deepEqual(getLocalSupabaseConfiguration(), { available: false, reason: "not_local" }),
  );
});

test("rechaza claves privilegiadas de ambos formatos", () => {
  const serviceRoleJwt = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  for (const key of ["sb_secret_local-test", serviceRoleJwt]) {
    withEnvironment(
      {
        CIAB_LOCAL_AUTH_ENABLED: "true",
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_ANON_KEY: key,
      },
      () => assert.deepEqual(getLocalSupabaseConfiguration(), { available: false, reason: "privileged_key" }),
    );
  }
});
