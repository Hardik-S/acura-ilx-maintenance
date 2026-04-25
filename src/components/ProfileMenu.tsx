"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { Bot, KeyRound, LogOut, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { CodexChat } from "@/components/CodexChat";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ProfileMenu() {
  const menuRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return;
        }
        setEmail(user.email ?? "");
        const { data: profile } = await supabase.from("profiles").select("full_name, preferences").eq("id", user.id).maybeSingle();
        setDisplayName(profile?.full_name || user.email || "");
        const preferences = profile?.preferences && typeof profile.preferences === "object" ? profile.preferences : {};
        if ("theme" in preferences && typeof preferences.theme === "string") {
          setTheme(preferences.theme);
        }
      } catch {
        setEmail("");
      }
    }

    void loadUser();
  }, [setTheme]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleThemeToggle() {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ preferences: { theme: nextTheme } }).eq("id", user.id);
    }
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login/";
  }

  if (!email) {
    return null;
  }

  return (
    <div ref={menuRef} className="relative">
      <Button type="button" variant="outline" className="h-10 px-2 sm:px-3" onClick={() => setOpen((current) => !current)}>
        <UserCircle className="h-5 w-5" aria-hidden="true" />
        <span className="hidden max-w-36 truncate sm:inline">{displayName || email}</span>
      </Button>
      {open ? (
        <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-subtle">
          <div className="border-b px-3 py-3">
            <p className="truncate text-sm font-medium">{displayName || "Profile"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="p-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={handleThemeToggle}
            >
              <span className="inline-flex items-center gap-2">
                {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                Dark mode
              </span>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {resolvedTheme === "dark" ? "On" : "Off"}
              </span>
            </button>
            <ProfileMenuLink href="/preferences/" icon={Settings} label="Preferences" />
            <ProfileMenuLink href="/change-password/" icon={KeyRound} label="Change password" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false);
                setCodexOpen(true);
              }}
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              Talk to Codex
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
      <CodexChat open={codexOpen} onClose={() => setCodexOpen(false)} />
    </div>
  );
}

function ProfileMenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <Link href={href} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
      <Icon className="h-4 w-4" aria-hidden={true} />
      {label}
    </Link>
  );
}
