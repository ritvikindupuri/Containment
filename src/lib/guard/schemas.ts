import { z } from "zod";

export const actionSchema = z.object({
  type: z.enum(["shell", "file_read", "file_write", "network", "tool_call"]),
  command: z.string().max(20_000).optional(),
  path: z.string().max(4_000).optional(),
  content: z.string().max(200_000).optional(),
  url: z.string().max(4_000).optional(),
  body: z.string().max(200_000).optional(),
  tool: z.string().max(200).optional(),
  args: z.record(z.unknown()).optional(),
  untrusted_context: z.string().max(200_000).optional(),
  agent_id: z.string().max(200).optional(),
});

export type ActionInput = z.infer<typeof actionSchema>;

export const policyUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  note: z.string().max(300).optional(),
  mode: z.enum(["enforce", "monitor"]),
  block_shell: z.boolean(),
  block_filesystem: z.boolean(),
  block_network: z.boolean(),
  block_injection: z.boolean(),
  allowed_hosts: z.array(z.string().max(255)).max(200),
  allowed_write_paths: z.array(z.string().max(500)).max(200),
  approval_required_tools: z.array(z.string().max(200)).max(200),
  deny_threshold: z.number().int().min(1).max(100),
  approval_threshold: z.number().int().min(1).max(100),
});

export const recommendedPolicySchema = policyUpdateSchema
  .omit({ id: true, name: true })
  .extend({ note: z.string().max(300).optional() });
