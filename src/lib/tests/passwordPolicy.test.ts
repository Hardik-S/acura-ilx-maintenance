import { describe, expect, it } from "vitest";
import { validateNewPassword } from "@/lib/auth/passwordPolicy";

describe("validateNewPassword", () => {
  it("rejects short or common bootstrap passwords", () => {
    expect(validateNewPassword("pass123").valid).toBe(false);
    expect(validateNewPassword("short1").valid).toBe(false);
  });

  it("requires matching confirmation", () => {
    const result = validateNewPassword("better-passphrase-2026", "different-passphrase-2026");

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Passwords must match.");
  });

  it("accepts a long passphrase", () => {
    expect(validateNewPassword("better-passphrase-2026", "better-passphrase-2026")).toEqual({
      valid: true,
      errors: [],
    });
  });
});
