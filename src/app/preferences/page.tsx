"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [themePreference, setThemePreference] = useState("system");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, preferences")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) {
          throw profileError;
        }
        const preferences = profile?.preferences && typeof profile.preferences === "object" ? profile.preferences : {};
        const savedTheme = "theme" in preferences && typeof preferences.theme === "string" ? preferences.theme : "system";
        setDisplayName(profile?.full_name ?? "");
        setThemePreference(savedTheme);
        setTheme(savedTheme);
      } catch (unknownError) {
        setError(unknownError instanceof Error ? unknownError.message : "Failed to load preferences.");
      }
    }

    void loadProfile();
  }, [setTheme]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be signed in.");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: displayName.trim(),
          preferences: { theme: themePreference },
        })
        .eq("id", user.id);
      if (updateError) {
        throw updateError;
      }

      setTheme(themePreference);
      setMessage("Preferences saved.");
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your profile display and app theme.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>These settings follow your signed-in account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <select
                id="theme"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={themePreference || theme || "system"}
                onChange={(event) => setThemePreference(event.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            {message ? <p className="rounded-md bg-muted px-3 py-2 text-sm">{message}</p> : null}
            {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? "Saving" : "Save preferences"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
