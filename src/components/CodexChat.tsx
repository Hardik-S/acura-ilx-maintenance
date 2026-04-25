"use client";

import { FormEvent, useState } from "react";
import { Bot, Github, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface CodexChatProps {
  open: boolean;
  onClose: () => void;
}

export function CodexChat({ open, onClose }: CodexChatProps) {
  const [request, setRequest] = useState("");
  const [area, setArea] = useState("Dashboard");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [context, setContext] = useState("");
  const [urgency, setUrgency] = useState<"low" | "normal" | "high">("normal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sign in before creating a Codex request.");
      }

      const response = await fetch("/api/github/issues/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request, area, expectedOutcome, context, urgency }),
      });
      const payload = (await response.json()) as { issueUrl?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Issue creation failed.");
      }

      setMessage(payload.issueUrl ? `Created GitHub issue: ${payload.issueUrl}` : "Created GitHub issue.");
      setRequest("");
      setExpectedOutcome("");
      setContext("");
      setUrgency("normal");
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Issue creation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/35 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-h-[720px] max-w-2xl flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-subtle">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Talk to Codex</h2>
              <p className="text-sm text-muted-foreground">Turn a request into a GitHub issue.</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close Codex chat">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div className="max-w-[86%] rounded-lg bg-muted p-3 text-sm">
            Tell me what should change, where it belongs, and what done looks like. I will package it into an issue for the repo.
          </div>
          {message ? (
            <div className="ml-auto max-w-[86%] rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">{message}</div>
          ) : null}
          {error ? <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 border-t p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_0.6fr]">
            <div className="space-y-2">
              <Label htmlFor="codexRequest">Request</Label>
              <Input id="codexRequest" value={request} onChange={(event) => setRequest(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codexArea">Area</Label>
              <Input id="codexArea" value={area} onChange={(event) => setArea(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="codexOutcome">Expected outcome</Label>
            <Textarea
              id="codexOutcome"
              value={expectedOutcome}
              onChange={(event) => setExpectedOutcome(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_0.45fr]">
            <div className="space-y-2">
              <Label htmlFor="codexContext">Context</Label>
              <Input id="codexContext" value={context} onChange={(event) => setContext(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codexUrgency">Urgency</Label>
              <select
                id="codexUrgency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as "low" | "normal" | "high")}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Github className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {loading ? "Creating issue" : "Create GitHub issue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
