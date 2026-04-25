import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

loadDotEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const temporaryPassword = process.env.ADMIN_TEMP_PASSWORD ?? "pass123";
const adminEmails = ["kabir.sethi113@gmail.com", "batb4016@gmail.com"];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

for (const email of adminEmails) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: email.split("@")[0],
    },
  });

  if (error && error.code !== "email_exists" && !error.message.toLowerCase().includes("registered")) {
    throw error;
  }

  const userId = data.user?.id ?? (await findUserIdByEmail(email));
  if (!userId) {
    throw new Error(`Unable to resolve user id for ${email}.`);
  }

  const { data: profile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (profileLookupError) {
    throw profileLookupError;
  }

  if (!profile) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      full_name: email.split("@")[0],
      preferences: { theme: "system" },
      force_password_change: true,
    });
    if (profileError) {
      throw profileError;
    }
  }

  const { error: roleError } = await supabase.from("user_roles").upsert({
    user_id: userId,
    role: "admin",
  });
  if (roleError) {
    throw roleError;
  }

  console.log(`Admin ready: ${email}`);
}

async function findUserIdByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
}

function loadDotEnvLocal() {
  if (!existsSync(".env.local")) {
    return;
  }

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}
