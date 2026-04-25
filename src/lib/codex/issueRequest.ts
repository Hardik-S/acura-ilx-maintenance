import { z } from "zod";

export const codexIssueRequestSchema = z
  .object({
    request: z.string().trim().min(1, "request is required").max(4000, "request is too long"),
    area: z.string().trim().min(1, "area is required").max(80, "area is too long"),
    expectedOutcome: z
      .string()
      .trim()
      .min(1, "expectedOutcome is required")
      .max(2000, "expectedOutcome is too long"),
    context: z.string().trim().max(3000, "context is too long").optional().default(""),
    urgency: z.enum(["low", "normal", "high"]).default("normal"),
  })
  .strict();

export type CodexIssueRequest = z.infer<typeof codexIssueRequestSchema>;

export function parseCodexIssueRequest(input: unknown): CodexIssueRequest {
  const parsed = codexIssueRequestSchema.safeParse(input);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || "request";
    const message = issue?.message || "Invalid Codex issue request";
    throw new Error(`${field}: ${message}`);
  }

  return parsed.data;
}
