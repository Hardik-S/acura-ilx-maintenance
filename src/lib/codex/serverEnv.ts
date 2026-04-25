export type CodexIssueServerConfig = {
  githubToken: string;
  githubRepo: string;
  supabaseJwtSecret: string;
};

type EnvSource = Record<string, string | undefined>;

function requireServerEnv(env: EnvSource, name: string) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getCodexIssueServerConfig(env: EnvSource = process.env): CodexIssueServerConfig {
  return {
    githubToken: requireServerEnv(env, "GITHUB_TOKEN"),
    githubRepo: requireServerEnv(env, "GITHUB_REPO"),
    supabaseJwtSecret: requireServerEnv(env, "SUPABASE_JWT_SECRET"),
  };
}
