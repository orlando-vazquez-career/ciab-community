import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageMemberships,
  canManageRoles,
} from  "../src/backend/identity/policy.ts";

function member(status, role) {
  return { userId: "00000000-0000-4000-8000-000000000001", status, role, profile: null };
}

test("only active administrators can manage memberships", () => {
  assert.equal(canManageMemberships(member("active", "admin")), true);
  assert.equal(canManageMemberships(member("active", "superadmin")), true);
  assert.equal(canManageMemberships(member("active", "moderator")), false);
  assert.equal(canManageMemberships(member("pending", "admin")), false);
  assert.equal(canManageMemberships(member("suspended", "superadmin")), false);
  assert.equal(canManageMemberships(member("active", null)), false);
});

test("only an active superadmin can change roles", () => {
  assert.equal(canManageRoles(member("active", "superadmin")), true);
  assert.equal(canManageRoles(member("active", "admin")), false);
  assert.equal(canManageRoles(member("pending", "superadmin")), false);
  assert.equal(canManageRoles(member("active", null)), false);
});
