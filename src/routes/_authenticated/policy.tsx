import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/guard/app-shell";
import { POLICY_SAVED_KEY } from "@/components/guard/getting-started";
import { getPolicy, updatePolicy } from "@/lib/guard.functions";
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
        },
      }),
    onSuccess: () => {
      window.localStorage.setItem(POLICY_SAVED_KEY, "1");
      queryClient.invalidateQueries({ queryKey: ["policy"] });
      toast.success("Policy saved — new decisions use it immediately.");
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-mono">Policy</span>
          <h1 className="mt-2 text-3xl font-semibold">Guard rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Applies to every key and every request in this workspace.</p>
        </div>
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          Save policy
        </Button>
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
