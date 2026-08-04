import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/guard/app-shell";
import { StageIntro } from "@/components/guard/stage-intro";
import { FlowGate } from "@/components/guard/flow-gate";
import { POLICY_SAVED_KEY } from "@/components/guard/getting-started";
import { getPolicy, listPolicyVersions, updatePolicy, type PolicyVersionRow } from "@/lib/guard.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/policy")({
  head: () => ({
    meta: [
      { title: "Policy — Containment guard rules" },
      { name: "description", content: "Tune enforcement mode, blocked vectors, egress allowlists and approval thresholds." },
      { property: "og:title", content: "Policy — Containment" },
      { property: "og:description", content: "Tune enforcement mode, blocked vectors and approval thresholds." },
    ],
  }),
  component: PolicyPage,
});

type PolicyRow = {
  id: string;
  name: string;
  version: number;
  mode: "enforce" | "monitor";
  block_shell: boolean;
  block_filesystem: boolean;
  block_network: boolean;
  block_injection: boolean;
  allowed_hosts: string[];
  allowed_write_paths: string[];
  approval_required_tools: string[];
  deny_threshold: number;
  approval_threshold: number;
};

const VECTORS = [
  ["block_shell", "Command execution", "Reverse shells, pipe-to-interpreter, escalation, container escapes."],
  ["block_filesystem", "Filesystem breakout", "Traversal, credential stores, writes outside allowed roots."],
  ["block_network", "Network egress", "Metadata endpoints, internal ranges, non-allowlisted hosts."],
  ["block_injection", "Prompt injection", "Instruction overrides in ingested content driving tool calls."],
] as const;

function PolicyPage() {
  const queryClient = useQueryClient();
  const fetchPolicy = useServerFn(getPolicy);
  const save = useServerFn(updatePolicy);
  const { data, isLoading } = useQuery({ queryKey: ["policy"], queryFn: () => fetchPolicy() as Promise<PolicyRow> });

  const fetchVersions = useServerFn(listPolicyVersions);
  const versions = useQuery({
    queryKey: ["policy-versions"],
    queryFn: () => fetchVersions() as Promise<PolicyVersionRow[]>,
  });

  const [note, setNote] = useState("");
  const [form, setForm] = useState<PolicyRow | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: PolicyRow) =>
      save({
        data: {
          id: payload.id,
          name: payload.name,
          mode: payload.mode,
          block_shell: payload.block_shell,
          block_filesystem: payload.block_filesystem,
          block_network: payload.block_network,
          block_injection: payload.block_injection,
          allowed_hosts: payload.allowed_hosts,
          allowed_write_paths: payload.allowed_write_paths,
          approval_required_tools: payload.approval_required_tools,
          deny_threshold: payload.deny_threshold,
          approval_threshold: payload.approval_threshold,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      }),
    onSuccess: (saved) => {
      window.localStorage.setItem(POLICY_SAVED_KEY, "1");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["policy"] });
      queryClient.invalidateQueries({ queryKey: ["policy-versions"] });
      toast.success(`Saved as version ${(saved as PolicyRow).version} — new decisions record this version.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save policy"),
  });

  if (isLoading || !form) {
    return (
      <AppShell>
        <p className="py-20 text-center text-sm text-muted-foreground">Loading policy…</p>
      </AppShell>
    );
  }

  const patch = (next: Partial<PolicyRow>) => setForm({ ...form, ...next });

  return (
    <AppShell>
      <FlowGate stage="policy">
      <StageIntro stage="policy" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-mono">Policy</span>
          <h1 className="mt-2 text-3xl font-semibold">Guard rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Applies to every key and every request in this workspace. Currently on{" "}
            <span className="font-mono">version {form.version}</span> — saving creates a new version and every decision
            records the version that ruled it.
          </p>
        </div>
        <div className="flex w-full max-w-md items-end gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="note">What changed? (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Allow registry.internal for build agents"
              maxLength={300}
            />
          </div>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            Save as v{form.version + 1}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Enforcement</CardTitle>
            <CardDescription>
              Monitor mode records the verdict the engine computed but always returns allow, so you can tune rules
              against live traffic before blocking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Policy name</Label>
              <Input id="name" value={form.name} onChange={(event) => patch({ name: event.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Enforce blocking</p>
                <p className="text-xs text-muted-foreground">
                  {form.mode === "enforce" ? "Denied actions are refused." : "Monitor only — nothing is refused."}
                </p>
              </div>
              <Switch
                checked={form.mode === "enforce"}
                onCheckedChange={(checked) => patch({ mode: checked ? "enforce" : "monitor" })}
              />
            </div>

            {VECTORS.map(([key, title, detail]) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="pr-4">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
                <Switch checked={form[key]} onCheckedChange={(checked) => patch({ [key]: checked } as Partial<PolicyRow>)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Allowlists</CardTitle>
              <CardDescription>One entry per line.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ListField
                label="Allowed egress hosts"
                hint="Requests to any other host are flagged. Leave empty to allow all public hosts."
                value={form.allowed_hosts}
                onChange={(allowed_hosts) => patch({ allowed_hosts })}
              />
              <ListField
                label="Writable roots"
                hint="File writes resolved outside these prefixes are blocked."
                value={form.allowed_write_paths}
                onChange={(allowed_write_paths) => patch({ allowed_write_paths })}
              />
              <ListField
                label="Approval-gated tools"
                hint="These tool calls always require a human, even with a clean action."
                value={form.approval_required_tools}
                onChange={(approval_required_tools) => patch({ approval_required_tools })}
              />
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Risk thresholds</CardTitle>
              <CardDescription>Score 0–100 from the rules that fired.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deny">Deny at or above</Label>
                <Input
                  id="deny"
                  type="number"
                  min={1}
                  max={100}
                  value={form.deny_threshold}
                  onChange={(event) => patch({ deny_threshold: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approval">Require approval at or above</Label>
                <Input
                  id="approval"
                  type="number"
                  min={1}
                  max={100}
                  value={form.approval_threshold}
                  onChange={(event) => patch({ approval_threshold: Number(event.target.value) })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Version history</CardTitle>
          <CardDescription>
            Every save snapshots the full rule set. Audit entries reference these version numbers, so you can always tell
            which rules produced a verdict.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {versions.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : (versions.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {(versions.data ?? []).map((entry) => (
                <details key={entry.id} className="py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                    <span className="label-mono text-primary">v{entry.version}</span>
                    <span className="font-medium">{entry.note ?? "Policy updated"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                    {entry.version === form.version ? (
                      <span className="label-mono text-success">in force</span>
                    ) : null}
                  </summary>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>Mode: {entry.snapshot.mode}</p>
                    <p>
                      Thresholds: deny {entry.snapshot.deny_threshold} · approval {entry.snapshot.approval_threshold}
                    </p>
                    <p>
                      Vectors blocked:{" "}
                      {[
                        entry.snapshot.block_shell ? "shell" : null,
                        entry.snapshot.block_filesystem ? "filesystem" : null,
                        entry.snapshot.block_network ? "network" : null,
                        entry.snapshot.block_injection ? "injection" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "none"}
                    </p>
                    <p>Allowed hosts: {entry.snapshot.allowed_hosts.join(", ") || "all public hosts"}</p>
                    <p>Writable roots: {entry.snapshot.allowed_write_paths.join(", ") || "none"}</p>
                    <p>Approval-gated tools: {entry.snapshot.approval_required_tools.join(", ") || "none"}</p>
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </FlowGate>
    </AppShell>
  );
}

function ListField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        rows={4}
        className="font-mono text-sm"
        value={value.join("\n")}
        onChange={(event) =>
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
