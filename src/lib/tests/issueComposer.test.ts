import { describe, expect, it } from "vitest";
import { composeCodexIssue } from "@/lib/codex/issueComposer";
import { parseCodexIssueRequest } from "@/lib/codex/issueRequest";
import { getCodexIssueServerConfig } from "@/lib/codex/serverEnv";
import { createInMemoryRateLimiter } from "@/lib/codex/rateLimit";
import { verifySupabaseJwt } from "@/lib/codex/supabaseJwt";

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function signTestJwt(payload: Record<string, unknown>, secret: string) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${body}`),
  );
  const encodedSignature = Buffer.from(signature)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${header}.${body}.${encodedSignature}`;
}

describe("composeCodexIssue", () => {
  it("builds a stable GitHub issue title and body from guided answers", () => {
    const issue = composeCodexIssue({
      request: "Add service reminder notifications",
      area: "Dashboard",
      expectedOutcome: "Show upcoming oil change reminders based on mileage.",
      context: "The latest odometer card already shows current mileage.",
      urgency: "normal",
      submittedByEmail: "kabir.sethi113@gmail.com",
    });

    expect(issue.title).toBe("Dashboard: Add service reminder notifications");
    expect(issue.labels).toEqual(["codex-request", "from-app"]);
    expect(issue.body).toContain("## Request");
    expect(issue.body).toContain("Add service reminder notifications");
    expect(issue.body).toContain("Submitted by: kabir.sethi113@gmail.com");
  });

  it("truncates long issue titles without changing the request body", () => {
    const longRequest = "A".repeat(160);
    const issue = composeCodexIssue({
      request: longRequest,
      area: "Data",
      expectedOutcome: "Keep the issue title readable.",
      context: "",
      urgency: "low",
      submittedByEmail: "batb4016@gmail.com",
    });

    expect(issue.title.length).toBeLessThanOrEqual(96);
    expect(issue.body).toContain(longRequest);
  });

  it("normalizes optional fields and includes structured metadata", () => {
    const issue = composeCodexIssue({
      request: "  Fix import errors  ",
      area: " Data ",
      expectedOutcome: " Imports complete without duplicate rows. ",
      context: "",
      urgency: "high",
      submittedByEmail: undefined,
      submittedByUserId: "user-123",
    });

    expect(issue.title).toBe("Data: Fix import errors");
    expect(issue.body).toContain("## Expected outcome");
    expect(issue.body).toContain("Imports complete without duplicate rows.");
    expect(issue.body).toContain("Urgency: high");
    expect(issue.body).toContain("Submitted by user id: user-123");
    expect(issue.body).not.toContain("Submitted by: undefined");
  });
});

describe("parseCodexIssueRequest", () => {
  it("accepts the API route contract and trims user-controlled strings", () => {
    const parsed = parseCodexIssueRequest({
      request: " Add a CSV preview ",
      area: "Data",
      expectedOutcome: "Show the rows before importing.",
      context: "Workbook parser already returns rows.",
      urgency: "normal",
    });

    expect(parsed).toEqual({
      request: "Add a CSV preview",
      area: "Data",
      expectedOutcome: "Show the rows before importing.",
      context: "Workbook parser already returns rows.",
      urgency: "normal",
    });
  });

  it("rejects oversized request content before calling GitHub", () => {
    expect(() =>
      parseCodexIssueRequest({
        request: "A".repeat(4001),
        area: "Data",
        expectedOutcome: "Keep payloads bounded.",
        urgency: "low",
      }),
    ).toThrow(/request/i);
  });

  it("rejects unknown urgency values", () => {
    expect(() =>
      parseCodexIssueRequest({
        request: "Add reminders",
        area: "Dashboard",
        expectedOutcome: "Show upcoming maintenance.",
        urgency: "critical",
      }),
    ).toThrow(/urgency/i);
  });
});

describe("getCodexIssueServerConfig", () => {
  it("loads only server-side env names for GitHub and Supabase verification", () => {
    const config = getCodexIssueServerConfig({
      GITHUB_TOKEN: "ghs_server_token",
      GITHUB_REPO: "owner/repo",
      SUPABASE_JWT_SECRET: "jwt-secret",
      NEXT_PUBLIC_GITHUB_TOKEN: "must-not-be-read",
    });

    expect(config).toEqual({
      githubToken: "ghs_server_token",
      githubRepo: "owner/repo",
      supabaseJwtSecret: "jwt-secret",
    });
  });

  it("fails closed when a required server secret is missing", () => {
    expect(() =>
      getCodexIssueServerConfig({
        GITHUB_REPO: "owner/repo",
        SUPABASE_JWT_SECRET: "jwt-secret",
      }),
    ).toThrow(/GITHUB_TOKEN/);
  });
});

describe("createInMemoryRateLimiter", () => {
  it("limits repeated submissions by caller key within a fixed window", () => {
    const limiter = createInMemoryRateLimiter({ maxRequests: 2, windowMs: 60_000 });

    expect(limiter.check("user-123", 1_000).allowed).toBe(true);
    expect(limiter.check("user-123", 2_000).allowed).toBe(true);
    expect(limiter.check("user-123", 3_000)).toMatchObject({
      allowed: false,
      remaining: 0,
      resetAt: 61_000,
    });
    expect(limiter.check("user-123", 61_000).allowed).toBe(true);
  });
});

describe("verifySupabaseJwt", () => {
  it("verifies HS256 Supabase JWTs and returns stable caller identity", async () => {
    const token = await signTestJwt(
      {
        sub: "user-123",
        email: "driver@example.com",
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      "jwt-secret",
    );

    await expect(verifySupabaseJwt(token, "jwt-secret")).resolves.toEqual({
      userId: "user-123",
      email: "driver@example.com",
    });
  });

  it("rejects expired or tampered Supabase JWTs", async () => {
    const expired = await signTestJwt(
      {
        sub: "user-123",
        exp: Math.floor(Date.now() / 1000) - 1,
      },
      "jwt-secret",
    );

    await expect(verifySupabaseJwt(expired, "jwt-secret")).rejects.toThrow(/expired/i);
    await expect(verifySupabaseJwt(`${expired.slice(0, -1)}x`, "jwt-secret")).rejects.toThrow(
      /signature/i,
    );
  });
});
