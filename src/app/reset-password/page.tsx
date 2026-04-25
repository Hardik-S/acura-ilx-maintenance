"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateNewPassword } from "@/lib/auth/passwordPolicy";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const validation = validateNewPassword(password, confirmPassword);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      await markPasswordChanged();
      router.replace("/");
      router.refresh();
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Password update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Use a unique passphrase. The temporary password cannot be reused.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordFields
              password={password}
              confirmPassword={confirmPassword}
              setPassword={setPassword}
              setConfirmPassword={setConfirmPassword}
            />
            {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading} className="w-full">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {loading ? "Updating" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordFields({
  password,
  confirmPassword,
  setPassword,
  setConfirmPassword,
}: {
  password: string;
  confirmPassword: string;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>
    </>
  );
}

async function markPasswordChanged() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return;
  }

  await fetch("/api/account/complete-password-change/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}
