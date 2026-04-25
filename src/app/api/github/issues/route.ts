import { NextResponse, type NextRequest } from "next/server";
import { parseCodexIssueRequest } from "@/lib/codex/issueRequest";
import { composeCodexIssue } from "@/lib/codex/issueComposer";
import { createInMemoryRateLimiter } from "@/lib/codex/rateLimit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createId } from "@/lib/utils";

const limiter = createInMemoryRateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000 });

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error: userError } = await admin.auth.getUser(token);
  if (userError || !data.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const rateLimit = limiter.check(data.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests.", resetAt: rateLimit.resetAt }, { status: 429 });
  }

  let parsed;
  try {
    parsed = parseCodexIssueRequest(await request.json());
  } catch (unknownError) {
    return NextResponse.json(
      { error: unknownError instanceof Error ? unknownError.message : "Invalid request." },
      { status: 400 },
    );
  }

  const issue = composeCodexIssue({
    ...parsed,
    submittedByEmail: data.user.email,
    submittedByUserId: data.user.id,
  });

  const githubToken = process.env.GITHUB_ISSUE_TOKEN ?? process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO ?? "Hardik-S/acura-ilx-maintenance";
  if (!githubToken) {
    return NextResponse.json({ error: "GitHub issue token is not configured." }, { status: 500 });
  }

  const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(issue),
  });

  const githubPayload = (await response.json()) as { html_url?: string; number?: number; message?: string };
  if (!response.ok) {
    await insertIssueRequest(admin, data.user.id, data.user.email ?? "", parsed, null);
    return NextResponse.json({ error: githubPayload.message ?? "GitHub issue creation failed." }, { status: 502 });
  }

  await insertIssueRequest(admin, data.user.id, data.user.email ?? "", parsed, githubPayload.number ?? null);

  return NextResponse.json({ issueUrl: githubPayload.html_url });
}

async function insertIssueRequest(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  email: string,
  request: ReturnType<typeof parseCodexIssueRequest>,
  issueNumber: number | null,
) {
  await admin.from("codex_issue_requests").insert({
    id: createId("codex"),
    submitted_by: userId,
    submitted_by_email: email,
    area: request.area,
    request: request.request,
    expected_outcome: request.expectedOutcome,
    context: request.context,
    urgency: request.urgency,
    status: issueNumber ? "open" : "triaged",
    github_issue_number: issueNumber,
  });
}
