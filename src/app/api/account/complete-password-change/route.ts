import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

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

  const { error } = await admin
    .from("profiles")
    .update({ force_password_change: false, updated_at: new Date().toISOString() })
    .eq("id", data.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
