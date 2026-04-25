import type { CodexIssueRequest } from "./issueRequest";

export type CodexIssueInput = CodexIssueRequest & {
  submittedByEmail?: string;
  submittedByUserId?: string;
};

export type ComposedCodexIssue = {
  title: string;
  body: string;
  labels: string[];
};

const MAX_TITLE_LENGTH = 96;

function normalize(value: string | undefined) {
  return value?.trim() ?? "";
}

function truncateTitle(title: string) {
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }

  return `${title.slice(0, MAX_TITLE_LENGTH - 3).trimEnd()}...`;
}

export function composeCodexIssue(input: CodexIssueInput): ComposedCodexIssue {
  const request = normalize(input.request);
  const area = normalize(input.area);
  const expectedOutcome = normalize(input.expectedOutcome);
  const context = normalize(input.context);
  const urgency = input.urgency;
  const submittedByEmail = normalize(input.submittedByEmail);
  const submittedByUserId = normalize(input.submittedByUserId);

  const metadata = [
    `Urgency: ${urgency}`,
    submittedByEmail ? `Submitted by: ${submittedByEmail}` : undefined,
    submittedByUserId ? `Submitted by user id: ${submittedByUserId}` : undefined,
  ].filter(Boolean);

  const body = [
    "## Request",
    request,
    "",
    "## Expected outcome",
    expectedOutcome,
    "",
    "## Context",
    context || "No additional context provided.",
    "",
    "## Submission metadata",
    ...metadata,
  ].join("\n");

  return {
    title: truncateTitle(`${area}: ${request}`),
    body,
    labels: ["codex-request", "from-app"],
  };
}
