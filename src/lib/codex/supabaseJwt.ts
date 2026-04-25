export type VerifiedSupabaseUser = {
  userId: string;
  email?: string;
};

type JwtPayload = {
  sub?: unknown;
  email?: unknown;
  exp?: unknown;
};

function decodeBase64UrlJson<T>(input: string): T {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const json = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );

  return JSON.parse(json) as T;
}

function base64UrlToBytes(input: string) {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");

  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function verifySupabaseJwt(
  token: string,
  jwtSecret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<VerifiedSupabaseUser> {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson<{ alg?: unknown }>(encodedHeader);

  if (header.alg !== "HS256") {
    throw new Error("Unsupported JWT algorithm");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );

  if (!signatureValid) {
    throw new Error("Invalid JWT signature");
  }

  const payload = decodeBase64UrlJson<JwtPayload>(encodedPayload);

  if (typeof payload.exp === "number" && payload.exp <= now) {
    throw new Error("JWT expired");
  }

  if (typeof payload.sub !== "string" || payload.sub.trim() === "") {
    throw new Error("JWT subject is required");
  }

  return {
    userId: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
