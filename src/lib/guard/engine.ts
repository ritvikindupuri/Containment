import type { Finding, GuardAction, GuardPolicy, GuardResult, Verdict } from "./types";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type Pattern = {
  rule: string;
  re: RegExp;
  title: string;
  detail: string;
  score: number;
  hard: boolean;
  remediation?: string;
};

function match(text: string, patterns: Pattern[], vector: Finding["vector"]): Finding[] {
  const out: Finding[] = [];
  for (const p of patterns) {
    const m = p.re.exec(text);
    if (m) {
      out.push({
        rule: p.rule,
        vector,
        title: p.title,
        detail: p.detail,
        score: p.score,
        hard: p.hard,
        evidence: m[0].slice(0, 160),
        ...(p.remediation ? { remediation: p.remediation } : {}),
      });
    }
  }
  return out;
}

/** Collapse quoting/backslash tricks used to slip past naive string checks. */
export function normalizeCommand(raw: string): string {
  return raw
    .replace(/\\\n/g, " ")
    .replace(/["'`]/g, "")
    .replace(/\\(?=[a-zA-Z/.$-])/g, "")
    .replace(/\$\{IFS\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePath(raw: string): string {
  const decoded = safeDecode(raw).replace(/\\/g, "/");
  const isAbsolute = decoded.startsWith("/");
  const parts: string[] = [];
  for (const seg of decoded.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (parts.length && parts[parts.length - 1] !== "..") parts.pop();
      else if (!isAbsolute) parts.push("..");
      continue;
    }
    parts.push(seg);
  }
  return (isAbsolute ? "/" : "") + parts.join("/");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function withinRoot(path: string, root: string): boolean {
  const r = normalizePath(root).replace(/\/$/, "");
  return path === r || path.startsWith(r + "/");
}

/* ------------------------------------------------------------------ */
/* shell / command execution                                           */
/* ------------------------------------------------------------------ */

const SHELL_PATTERNS: Pattern[] = [
  {
    rule: "SHELL_REVERSE_SHELL",
    re: /(\/dev\/tcp\/[\d.a-z-]+\/\d+|\bnc\b[^\n|;]*\s-[a-z]*e\b|\bncat\b[^\n]*--exec|socat[^\n]*exec:|bash\s+-i\s*>&|sh\s+-i\s*>&)/i,
    title: "Reverse shell",
    detail: "The command opens an interactive shell back to a remote listener — the classic sandbox breakout.",
    score: 100,
    hard: true,
  },
  {
    rule: "SHELL_PIPE_TO_INTERPRETER",
    re: /\b(curl|wget|fetch)\b[^\n|;]*\|\s*(sudo\s+)?(ba|z|k|d)?sh\b|\|\s*python[23]?\b|\|\s*node\b/i,
    title: "Remote code piped into an interpreter",
    detail: "Downloaded bytes are executed directly, so nothing about the payload is reviewable before it runs.",
    score: 85,
    hard: true,
    remediation: "Download to a file, hash it, review it, then execute explicitly.",
  },
  {
    rule: "SHELL_CONTAINER_ESCAPE",
    re: /(nsenter\b|\/proc\/1\/(root|ns)|--privileged\b|-v\s*\/:\/|--pid=host|--net=host|capsh\s+--|\/var\/run\/docker\.sock|release_agent|chroot\s+\/proc)/i,
    title: "Container / namespace escape",
    detail: "The command reaches for host namespaces, the host root, or the container runtime socket.",
    score: 100,
    hard: true,
  },
  {
    rule: "SHELL_KERNEL_DEVICE_ACCESS",
    re: /(insmod|modprobe|mknod|mount\s+\/dev\/|dd\s+[^\n]*of=\/dev\/(sd|nvme|xvd)|mkfs(\.[a-z0-9]+)?\s)/i,
    title: "Raw device or kernel module access",
    detail: "Loading modules or writing block devices breaks out of any userspace confinement.",
    score: 95,
    hard: true,
  },
  {
    rule: "SHELL_PRIVILEGE_ESCALATION",
    re: /\b(sudo\b|su\s+-|pkexec\b|doas\b|chmod\s+(u\+s|4\d{3})|setcap\b|usermod\s+-aG\s+(sudo|docker|wheel))/i,
    title: "Privilege escalation",
    detail: "The agent is trying to gain rights beyond the identity the sandbox granted it.",
    score: 70,
    hard: true,
  },
  {
    rule: "SHELL_CREDENTIAL_HARVEST",
    re: /(cat|less|head|tail|cp|tar|zip|xxd|strings)\b[^\n]*(\/etc\/(shadow|passwd)|\.ssh\/|\.aws\/credentials|\.kube\/config|\.docker\/config\.json|\.netrc|\.env\b|id_(rsa|ed25519))/i,
    title: "Credential harvesting",
    detail: "The command reads secret material that no legitimate agent task requires.",
    score: 85,
    hard: true,
  },
  {
    rule: "SHELL_ENV_DUMP_EXFIL",
    re: /\b(env|printenv|set)\b[^\n]*(\||>\s*\/dev\/tcp|curl|wget|nc\b)/i,
    title: "Environment dump piped outward",
    detail: "Process environment carries API keys; piping it anywhere is exfiltration.",
    score: 90,
    hard: true,
  },
  {
    rule: "SHELL_OBFUSCATED_EXECUTION",
    re: /(base64\s+(-d|--decode)[^\n]*\|\s*\w*sh|echo\s+[A-Za-z0-9+/=]{40,}\s*\|\s*base64|eval\s*[("$]|python[23]?\s+-c\s*[^\n]*exec\(|\bxxd\s+-r\b[^\n]*\|)/i,
    title: "Obfuscated execution",
    detail: "Encoded or eval'd payloads exist to defeat review and static filters.",
    score: 80,
    hard: true,
  },
  {
    rule: "SHELL_DESTRUCTIVE",
    re: /(rm\s+-[a-z]*r[a-z]*f?\s+(\/|\/\*|~|\$HOME)(\s|$)|:\(\)\s*\{\s*:\|:&\s*\};:|shred\s+-|>\s*\/dev\/sda)/i,
    title: "Destructive command",
    detail: "Irreversible deletion or a fork bomb against the host filesystem.",
    score: 90,
    hard: true,
  },
  {
    rule: "SHELL_PERSISTENCE",
    re: /(crontab\s+-|\/etc\/cron\.|systemctl\s+(enable|start)|launchctl\s+load|\.bashrc|\.zshrc|authorized_keys)/i,
    title: "Persistence mechanism",
    detail: "The command installs something that survives the sandbox's lifetime.",
    score: 65,
    hard: true,
  },
  {
    rule: "SHELL_CLOUD_METADATA",
    re: /(169\.254\.169\.254|metadata\.google\.internal|100\.100\.100\.200|\/latest\/meta-data)/i,
    title: "Cloud metadata endpoint",
    detail: "The instance metadata service hands out cloud role credentials to whoever asks.",
    score: 100,
    hard: true,
  },
  {
    rule: "SHELL_PACKAGE_ARBITRARY_SOURCE",
    re: /\b(npm|pnpm|yarn|bun)\s+(i|install|add)\s+(https?:\/\/|git\+|github:|file:)|pip\s+install\s+(https?:\/\/|git\+|-e\s)/i,
    title: "Package install from an arbitrary source",
    detail: "Install scripts from unvetted sources run with the agent's full privileges.",
    score: 55,
    hard: false,
    remediation: "Pin to a registry version and install with --ignore-scripts.",
  },
  {
    rule: "SHELL_PROCESS_SPAWN_TOOLING",
    re: /\b(child_process|subprocess\.(Popen|call|run)|os\.system|Runtime\.getRuntime\(\)\.exec)\b/i,
    title: "Programmatic process spawning",
    detail: "Code that shells out from inside the runtime bypasses command-level review.",
    score: 45,
    hard: false,
  },
  {
    rule: "SHELL_NETWORK_LISTENER",
    re: /\b(nc|ncat|socat|python[23]?\s+-m\s+http\.server)\b[^\n]*(-l\b|-lvnp|LISTEN)/i,
    title: "Inbound listener",
    detail: "Opening a listening socket invites an operator into the sandbox.",
    score: 75,
    hard: true,
  },
];

function evaluateShell(action: GuardAction): Finding[] {
  const raw = action.command ?? "";
  if (!raw.trim()) return [];
  const normalized = normalizeCommand(raw);
  const findings = match(normalized, SHELL_PATTERNS, "shell");

  if (normalized !== raw.replace(/\s+/g, " ").trim() && findings.length > 0) {
    findings.push({
      rule: "SHELL_QUOTE_EVASION",
      vector: "shell",
      title: "Quote/escape evasion",
      detail: "The command only matched a dangerous pattern after unquoting, which indicates deliberate filter evasion.",
      score: 25,
      hard: false,
    });
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* filesystem                                                          */
/* ------------------------------------------------------------------ */

const SENSITIVE_PATH_RULES: { re: RegExp; rule: string; title: string; detail: string; score: number }[] = [
  {
    re: /^\/(etc\/(shadow|passwd|sudoers)|root\/)/,
    rule: "FS_SYSTEM_SECRET",
    title: "System credential file",
    detail: "Reading OS account or sudo configuration has no legitimate agent use.",
    score: 90,
  },
  {
    re: /(^|\/)\.(ssh|aws|kube|docker|gnupg|netrc)(\/|$)/,
    rule: "FS_USER_CREDENTIALS",
    title: "User credential store",
    detail: "SSH keys and cloud credential files are the primary target of an escaped agent.",
    score: 95,
  },
  {
    re: /(^|\/)\.env(\.[a-z]+)?$/,
    rule: "FS_ENV_FILE",
    title: "Environment secret file",
    detail: ".env files hold API keys and database URLs.",
    score: 80,
  },
  {
    re: /^\/(proc|sys|dev)(\/|$)/,
    rule: "FS_KERNEL_INTERFACE",
    title: "Kernel pseudo-filesystem",
    detail: "/proc, /sys and /dev expose host state and are a standard escape route.",
    score: 85,
  },
  {
    re: /var\/run\/docker\.sock|containerd\.sock|kubelet/,
    rule: "FS_RUNTIME_SOCKET",
    title: "Container runtime socket",
    detail: "Write access to the runtime socket is equivalent to root on the host.",
    score: 100,
  },
  {
    re: /(^|\/)(id_rsa|id_ed25519|\.git-credentials|credentials\.json|service-account.*\.json)$/,
    rule: "FS_KEY_MATERIAL",
    title: "Private key material",
    detail: "Direct access to a private key or service-account file.",
    score: 95,
  },
];

function evaluateFilesystem(action: GuardAction, policy: GuardPolicy): Finding[] {
  const raw = action.path ?? "";
  if (!raw.trim()) return [];
  const findings: Finding[] = [];
  const normalized = normalizePath(raw);
  const isWrite = action.type === "file_write";

  if (/\.\.(\/|\\|%2f)/i.test(safeDecode(raw))) {
    findings.push({
      rule: "FS_PATH_TRAVERSAL",
      vector: "filesystem",
      title: "Path traversal",
      detail: `"${raw}" escapes its base directory and resolves to ${normalized}.`,
      score: 70,
      hard: true,
      evidence: raw.slice(0, 160),
      remediation: "Resolve the path and reject anything outside the jail before touching the filesystem.",
    });
  }

  if (/(^|\/)(proc\/self\/root|proc\/1\/root)/.test(normalized)) {
    findings.push({
      rule: "FS_HOST_ROOT_VIA_PROC",
      vector: "filesystem",
      title: "Host root through /proc",
      detail: "/proc/<pid>/root reaches the host filesystem from inside a namespace.",
      score: 100,
      hard: true,
      evidence: normalized,
    });
  }

  for (const rule of SENSITIVE_PATH_RULES) {
    if (rule.re.test(normalized)) {
      findings.push({
        rule: rule.rule,
        vector: "filesystem",
        title: rule.title,
        detail: rule.detail,
        score: isWrite ? Math.min(100, rule.score + 5) : rule.score,
        hard: true,
        evidence: normalized,
      });
    }
  }

  if (isWrite && normalized.startsWith("/")) {
    const allowed = policy.allowed_write_paths.some((root) => withinRoot(normalized, root));
    if (!allowed) {
      findings.push({
        rule: "FS_WRITE_OUTSIDE_JAIL",
        vector: "filesystem",
        title: "Write outside the allowed roots",
        detail: `${normalized} is not under ${policy.allowed_write_paths.join(", ") || "(no roots configured)"}.`,
        score: 65,
        hard: true,
        evidence: normalized,
        remediation: "Add the root to the policy if this location is genuinely part of the agent's workspace.",
      });
    }
  }

  if (isWrite && /^\/(usr|bin|sbin|lib|boot|etc)(\/|$)/.test(normalized)) {
    findings.push({
      rule: "FS_SYSTEM_BINARY_WRITE",
      vector: "filesystem",
      title: "Write into a system directory",
      detail: "Writing executables or config into system paths persists code across the sandbox.",
      score: 85,
      hard: true,
      evidence: normalized,
    });
  }

  const content = action.content ?? "";
  if (isWrite && content) {
    findings.push(...match(content, SECRET_PATTERNS, "filesystem"));
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/* network                                                             */
/* ------------------------------------------------------------------ */

const SECRET_PATTERNS: Pattern[] = [
  {
    rule: "DATA_PRIVATE_KEY",
    re: /-----BEGIN\s+(RSA|EC|OPENSSH|PGP|PRIVATE)[A-Z ]*KEY-----/,
    title: "Private key in payload",
    detail: "A private key is being moved as data.",
    score: 95,
    hard: true,
  },
  {
    rule: "DATA_CLOUD_KEY",
    re: /\b(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35})\b/,
    title: "Cloud access key in payload",
    detail: "An AWS or Google API key appears in the outbound data.",
    score: 90,
    hard: true,
  },
  {
    rule: "DATA_PROVIDER_TOKEN",
    re: /\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sb_secret_[A-Za-z0-9_-]{10,})\b/,
    title: "Provider secret token in payload",
    detail: "A model-provider, GitHub, Slack or backend secret token appears in the payload.",
    score: 90,
    hard: true,
  },
  {
    rule: "DATA_JWT",
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    title: "Bearer token in payload",
    detail: "A JWT — likely a live session — is being sent outward.",
    score: 70,
    hard: false,
  },
];

const PRIVATE_V4 =
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.6[4-9]\.|100\.[7-9]\d\.|100\.1[0-1]\d\.|100\.12[0-7]\.)/;

function evaluateNetwork(action: GuardAction, policy: GuardPolicy): Finding[] {
  const raw = (action.url ?? "").trim();
  if (!raw) return [];
  const findings: Finding[] = [];

  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    findings.push({
      rule: "NET_UNPARSEABLE_URL",
      vector: "network",
      title: "Unparseable destination",
      detail: `"${raw}" is not a valid absolute URL, so it cannot be checked against the allowlist.`,
      score: 50,
      hard: true,
      evidence: raw.slice(0, 160),
    });
    return findings;
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const scheme = url.protocol.replace(":", "");

  if (!["http", "https"].includes(scheme)) {
    findings.push({
      rule: "NET_DANGEROUS_SCHEME",
      vector: "network",
      title: `Non-HTTP scheme (${scheme})`,
      detail: "file://, gopher://, dict:// and friends are used to read local files or pivot into internal services.",
      score: 90,
      hard: true,
      evidence: `${scheme}://`,
    });
  }

  const METADATA_HOSTS = ["169.254.169.254", "metadata.google.internal", "metadata.goog", "100.100.100.200", "169.254.170.2"];
  if (METADATA_HOSTS.includes(host)) {
    findings.push({
      rule: "NET_CLOUD_METADATA",
      vector: "network",
      title: "Cloud metadata service",
      detail: "This endpoint returns the instance's cloud role credentials to any process that can reach it.",
      score: 100,
      hard: true,
      evidence: host,
    });
  } else if (PRIVATE_V4.test(host) || host === "localhost" || host === "::1" || host.endsWith(".internal") || host.endsWith(".local")) {
    findings.push({
      rule: "NET_INTERNAL_TARGET",
      vector: "network",
      title: "Internal / loopback destination",
      detail: `${host} is a private or loopback address — a request there is server-side request forgery against your own infrastructure.`,
      score: 75,
      hard: true,
      evidence: host,
    });
  }

  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    findings.push({
      rule: "NET_ENCODED_HOST",
      vector: "network",
      title: "Numerically encoded host",
      detail: "Decimal/hex IP encodings exist to slip past hostname allowlists.",
      score: 80,
      hard: true,
      evidence: host,
    });
  }

  if (/\b(\d{1,3}[-.]\d{1,3}[-.]\d{1,3}[-.]\d{1,3})\.(nip|sslip|xip)\.io$/i.test(host)) {
    findings.push({
      rule: "NET_REBIND_SERVICE",
      vector: "network",
      title: "DNS rebinding service",
      detail: "Wildcard DNS services resolve to attacker-chosen addresses, including internal ones.",
      score: 85,
      hard: true,
      evidence: host,
    });
  }

  const allowed = policy.allowed_hosts.some(
    (entry) => {
      const h = entry.trim().toLowerCase();
      if (!h) return false;
      if (h.startsWith("*.")) return host === h.slice(2) || host.endsWith(h.slice(1));
      return host === h;
    },
  );
  if (!allowed) {
    findings.push({
      rule: "NET_HOST_NOT_ALLOWLISTED",
      vector: "network",
      title: "Destination not on the egress allowlist",
      detail: `${host} is not in the policy's allowed hosts.`,
      score: 45,
      hard: false,
      evidence: host,
      remediation: "Add the host to the policy if this egress is expected.",
    });
  }

  const payload = `${url.search} ${action.body ?? ""}`;
  findings.push(...match(payload, SECRET_PATTERNS, "network"));

  if ((action.body ?? "").length > 50_000 && !allowed) {
    findings.push({
      rule: "NET_BULK_EGRESS",
      vector: "network",
      title: "Large payload to an unapproved host",
      detail: "Bulk data leaving to a host nobody approved is the shape of an exfiltration.",
      score: 40,
      hard: false,
    });
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/* prompt injection -> tool abuse                                      */
/* ------------------------------------------------------------------ */

const INJECTION_PATTERNS: Pattern[] = [
  {
    rule: "INJ_INSTRUCTION_OVERRIDE",
    re: /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|earlier|above|all)\b[^.\n]{0,20}\b(instruction|prompt|rule|direction)/i,
    title: "Instruction override attempt",
    detail: "Ingested content tries to replace the operator's instructions.",
    score: 60,
    hard: false,
  },
  {
    rule: "INJ_ROLE_HIJACK",
    re: /\b(you are now|from now on you|new system prompt|act as (an? )?(unrestricted|developer|root|admin)|developer mode|DAN mode)\b/i,
    title: "Role hijack",
    detail: "Content attempts to redefine the agent's identity or permissions.",
    score: 55,
    hard: false,
  },
  {
    rule: "INJ_SECRET_SOLICITATION",
    re: /\b(system prompt|api[_ ]?key|access token|\.env|credentials|secret key|password)\b[^.\n]{0,40}\b(print|reveal|show|output|send|paste|include|repeat)\b|\b(print|reveal|show|output|send|paste|repeat)\b[^.\n]{0,40}\b(system prompt|api[_ ]?key|access token|\.env|credentials|secret key)\b/i,
    title: "Secret solicitation",
    detail: "Content asks the agent to disclose prompts, keys, or credentials.",
    score: 75,
    hard: true,
  },
  {
    rule: "INJ_EMBEDDED_COMMAND",
    re: /\b(run|execute|paste into (your )?(terminal|shell)|curl\s+https?:\/\/|npm\s+i\s|pip\s+install\s|chmod\s+\+x)\b[^\n]{0,60}(\||;|&&|sh\b|bash\b)?/i,
    title: "Embedded command instruction",
    detail: "Ingested content contains an executable instruction aimed at the agent's tools.",
    score: 50,
    hard: false,
  },
  {
    rule: "INJ_EXFIL_INSTRUCTION",
    re: /\b(send|post|upload|forward|exfiltrate|email)\b[^.\n]{0,50}\b(to\s+https?:\/\/|webhook|attacker|pastebin|requestbin|burpcollaborator)\b/i,
    title: "Exfiltration instruction",
    detail: "Content directs the agent to ship data to an external collector.",
    score: 85,
    hard: true,
  },
  {
    rule: "INJ_HIDDEN_PAYLOAD",
    re: /[\u200b-\u200f\u202a-\u202e\u2060-\u2064]|<!--[\s\S]{0,200}(ignore|system|instruction)[\s\S]{0,200}-->/i,
    title: "Hidden / invisible instructions",
    detail: "Zero-width characters, bidi overrides or HTML comments carry instructions a human reviewer cannot see.",
    score: 70,
    hard: true,
  },
  {
    rule: "INJ_ENCODED_PAYLOAD",
    re: /\b[A-Za-z0-9+/]{120,}={0,2}\b/,
    title: "Long encoded blob",
    detail: "A base64-sized blob inside ingested content is a common carrier for hidden instructions.",
    score: 30,
    hard: false,
  },
];

const MUTATING_TOOL = /(delete|drop|remove|purge|transfer|payment|charge|refund|send|email|sms|deploy|publish|revoke|grant|rotate|shutdown|terminate|exec|run_)/i;

function evaluateInjection(action: GuardAction): Finding[] {
  const context = action.untrusted_context ?? "";
  if (!context.trim()) return [];
  return match(context, INJECTION_PATTERNS, "injection");
}

function evaluateToolCall(action: GuardAction, policy: GuardPolicy, injectionFindings: Finding[]): Finding[] {
  const tool = (action.tool ?? "").trim();
  if (!tool) return [];
  const findings: Finding[] = [];
  const serialized = JSON.stringify(action.args ?? {});

  if (policy.approval_required_tools.map((t) => t.trim().toLowerCase()).includes(tool.toLowerCase())) {
    findings.push({
      rule: "TOOL_APPROVAL_REQUIRED",
      vector: "injection",
      title: "Tool requires human approval",
      detail: `"${tool}" is on the approval list, so it never runs unattended.`,
      score: 40,
      hard: false,
      evidence: tool,
    });
  }

  const mutating = MUTATING_TOOL.test(tool);
  if (mutating && injectionFindings.length > 0) {
    findings.push({
      rule: "TOOL_INJECTION_DRIVEN_MUTATION",
      vector: "injection",
      title: "Injected content is driving a mutating tool",
      detail: `"${tool}" changes state and this call follows untrusted content that contains injection markers. This is the exact pattern of an indirect prompt-injection takeover.`,
      score: 90,
      hard: true,
      evidence: tool,
      remediation: "Require explicit human approval for this call, or re-run the task without the untrusted source.",
    });
  } else if (mutating) {
    findings.push({
      rule: "TOOL_MUTATING_ACTION",
      vector: "injection",
      title: "State-changing tool call",
      detail: `"${tool}" mutates data or contacts the outside world.`,
      score: 20,
      hard: false,
      evidence: tool,
    });
  }

  findings.push(...match(serialized, SECRET_PATTERNS, "injection"));

  const urlArg = /https?:\/\/[^\s"']+/i.exec(serialized);
  if (urlArg && injectionFindings.length > 0) {
    findings.push({
      rule: "TOOL_URL_FROM_UNTRUSTED",
      vector: "injection",
      title: "Outbound URL sourced from untrusted content",
      detail: "The tool arguments carry a URL while the surrounding context is flagged for injection.",
      score: 55,
      hard: false,
      evidence: urlArg[0].slice(0, 120),
    });
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/* orchestration                                                       */
/* ------------------------------------------------------------------ */

const VECTOR_ENABLED: Record<Finding["vector"], keyof GuardPolicy> = {
  shell: "block_shell",
  filesystem: "block_filesystem",
  network: "block_network",
  injection: "block_injection",
};

export function evaluateAction(action: GuardAction, policy: GuardPolicy): GuardResult {
  const injectionFindings = evaluateInjection(action);
  const findings: Finding[] = [...injectionFindings];

  switch (action.type) {
    case "shell":
      findings.push(...evaluateShell(action));
      break;
    case "file_read":
    case "file_write":
      findings.push(...evaluateFilesystem(action, policy));
      break;
    case "network":
      findings.push(...evaluateNetwork(action, policy));
      break;
    case "tool_call":
      findings.push(...evaluateToolCall(action, policy, injectionFindings));
      break;
  }

  // A shell command or file path smuggled inside another action type is still checked.
  if (action.type !== "shell" && action.command) findings.push(...evaluateShell(action));
  if (action.type === "shell" && action.url) findings.push(...evaluateNetwork(action, policy));

  const active = findings.filter((f) => policy[VECTOR_ENABLED[f.vector]] === true);
  const deduped = dedupe(active);

  const risk = Math.min(
    100,
    Math.round(deduped.reduce((sum, f, i) => sum + (i === 0 ? f.score : f.score * 0.45), 0)),
  );

  let intended: Verdict = "allow";
  const hard = deduped.find((f) => f.hard);
  const approvalOnly = deduped.some((f) => f.rule === "TOOL_APPROVAL_REQUIRED");

  if (hard) intended = "deny";
  else if (risk >= policy.deny_threshold) intended = "deny";
  else if (approvalOnly || risk >= policy.approval_threshold) intended = "needs_approval";

  const enforced = policy.mode === "enforce";
  const verdict: Verdict = enforced ? intended : "allow";

  return {
    verdict,
    intended_verdict: intended,
    enforced,
    risk_score: risk,
    action_type: action.type,
    findings: deduped.sort((a, b) => b.score - a.score),
    summary: summarize(intended, deduped, enforced),
  };
}

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => (seen.has(f.rule) ? false : (seen.add(f.rule), true)));
}

function summarize(verdict: Verdict, findings: Finding[], enforced: boolean): string {
  const prefix = enforced ? "" : "Monitor mode — action allowed through. ";
  if (findings.length === 0) return `${prefix}No escape indicators found.`;
  const top = findings.slice().sort((a, b) => b.score - a.score)[0]!;
  if (verdict === "deny") return `${prefix}Blocked: ${top.title.toLowerCase()}.`;
  if (verdict === "needs_approval") return `${prefix}Held for human approval: ${top.title.toLowerCase()}.`;
  return `${prefix}Allowed with ${findings.length} low-severity note${findings.length === 1 ? "" : "s"}.`;
}
