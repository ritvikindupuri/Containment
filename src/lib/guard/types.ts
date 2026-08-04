export type ActionType = "shell" | "file_read" | "file_write" | "network" | "tool_call";

export type Verdict = "allow" | "deny" | "needs_approval";

export type Vector = "shell" | "filesystem" | "network" | "injection";

export type GuardAction = {
  type: ActionType;
  /** shell: the full command line the agent wants to run */
  command?: string;
  /** file_read / file_write: target path */
  path?: string;
  /** file_write: content to be written */
  content?: string;
  /** network: absolute request URL */
  url?: string;
  /** network: outbound request body */
  body?: string;
  /** tool_call: tool name */
  tool?: string;
  /** tool_call: serialized arguments */
  args?: Record<string, unknown>;
  /**
   * Untrusted text the model ingested before proposing this action
   * (web page, tool output, retrieved document, user file).
   */
  untrusted_context?: string;
  /** free-form agent/session identifier for the audit trail */
  agent_id?: string;
};

export type GuardPolicy = {
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

export type Finding = {
  /** stable rule id, e.g. SHELL_REVERSE_SHELL */
  rule: string;
  vector: Vector;
  title: string;
  detail: string;
  /** 0-100 contribution to the risk score */
  score: number;
  /** hard findings deny outright when their vector is enforced */
  hard: boolean;
  /** matched substring, for the audit trail */
  evidence?: string;
  remediation?: string;
};

export type GuardResult = {
  verdict: Verdict;
  /** verdict the engine computed, even when mode = monitor */
  intended_verdict: Verdict;
  enforced: boolean;
  risk_score: number;
  action_type: ActionType;
  findings: Finding[];
  summary: string;
};

export const DEFAULT_POLICY: GuardPolicy = {
  mode: "enforce",
  block_shell: true,
  block_filesystem: true,
  block_network: true,
  block_injection: true,
  allowed_hosts: ["api.openai.com", "registry.npmjs.org", "pypi.org"],
  allowed_write_paths: ["/workspace", "/tmp"],
  approval_required_tools: ["send_email", "transfer_funds", "delete_records"],
  deny_threshold: 60,
  approval_threshold: 35,
};
