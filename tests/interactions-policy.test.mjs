import assert from "node:assert/strict";
import test from "node:test";

const policyModule = await import("../src/backend/interactions/policy.ts").catch(() => ({}));
const { canCreateComment, canReportContent, canVoteOnPost } = policyModule;

function member(status, role = "member", userId = "50000000-0000-4000-8000-000000000001") {
  return { userId, status, role, profile: null };
}

test("solo miembros activos pueden comentar y reportar contenido", () => {
  assert.equal(typeof canCreateComment, "function");
  assert.equal(typeof canReportContent, "function");
  assert.equal(canCreateComment?.(member("active")), true);
  assert.equal(canCreateComment?.(member("pending")), false);
  assert.equal(canCreateComment?.(member("suspended")), false);
  assert.equal(canReportContent?.(member("active")), true);
  assert.equal(canReportContent?.(member("pending")), false);
});

test("un miembro activo no vota su propia publicación", () => {
  assert.equal(typeof canVoteOnPost, "function");
  const active = member("active");
  assert.equal(canVoteOnPost?.(active, "60000000-0000-4000-8000-000000000001"), true);
  assert.equal(canVoteOnPost?.(active, active.userId), false);
  assert.equal(canVoteOnPost?.(member("pending"), "60000000-0000-4000-8000-000000000001"), false);
});
