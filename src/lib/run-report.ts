import { jsPDF } from "jspdf";
import type { AgentRunPlan } from "@/lib/agent-run.functions";
import type { Finding, GuardResult, Verdict } from "@/lib/guard/types";

export type ReportStepResult = GuardResult & {
  decision_id?: string;
  policy_version?: number;
  policy_mode?: "enforce" | "monitor";
};

export type RunReportInput = {
  plan: AgentRunPlan;
  results: Record<number, ReportStepResult>;
  policyVersion: number | null;
  policyMode: "enforce" | "monitor" | null;
  operator: string;
  startedAt: string | null;
  finishedAt: string | null;
};

/* Print-safe palette that mirrors the console's graphite + signal amber. */
const INK = [24, 24, 27] as const;
const MUTED = [110, 112, 118] as const;
const RULE = [206, 208, 214] as const;
const AMBER = [180, 118, 12] as const;
const RED = [168, 42, 42] as const;
const GREEN = [30, 110, 70] as const;
const PANEL = [246, 246, 247] as const;

type Rgb = readonly [number, number, number];

function ink(pdf: jsPDF, c: Rgb | readonly number[]) {
  pdf.setTextColor(c[0]!, c[1]!, c[2]!);
}
function stroke(pdf: jsPDF, c: Rgb | readonly number[]) {
  pdf.setDrawColor(c[0]!, c[1]!, c[2]!);
}
function fill(pdf: jsPDF, c: Rgb | readonly number[]) {
  pdf.setFillColor(c[0]!, c[1]!, c[2]!);
}

const MARGIN = 52;
const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

const VERDICT_LABEL: Record<Verdict, string> = {
  allow: "Allowed",
  deny: "Blocked",
  needs_approval: "Held for approval",
};

function verdictColor(verdict: Verdict) {
  if (verdict === "deny") return RED;
  if (verdict === "needs_approval") return AMBER;
  return GREEN;
}

function actionLine(action: AgentRunPlan["steps"][number]["action"]): string {
  if (action.type === "shell") return action.command ?? "";
  if (action.type === "network") return `${action.url ?? ""}${action.body ? `  body: ${action.body}` : ""}`;
  if (action.type === "tool_call") return `${action.tool ?? ""}(${JSON.stringify(action.args ?? {})})`;
  if (action.type === "file_write") return `${action.path ?? ""}${action.content ? `  <- ${action.content}` : ""}`;
  return action.path ?? "";
}

function stamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Small stateful writer that handles wrapping, page breaks and the footer. */
class Doc {
  readonly pdf = new jsPDF({ unit: "pt", format: "a4" });
  y = MARGIN;
  page = 1;
  reportId = "";
  repo = "";

  space(amount: number) {
    this.y += amount;
  }

  ensure(height: number) {
    if (this.y + height <= PAGE_H - MARGIN - 24) return;
    this.footer();
    this.pdf.addPage();
    this.page += 1;
    this.y = MARGIN;
  }

  footer() {
    const pdf = this.pdf;
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, PAGE_H - MARGIN - 14, PAGE_W - MARGIN, PAGE_H - MARGIN - 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    pdf.text(`Containment — agent containment report · ${this.repo} · ${this.reportId}`, MARGIN, PAGE_H - MARGIN);
    pdf.text(`Page ${this.page}`, PAGE_W - MARGIN, PAGE_H - MARGIN, { align: "right" });
  }

  heading(text: string) {
    this.ensure(46);
    this.space(10);
    const pdf = this.pdf;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11.5);
    pdf.setTextColor(...INK);
    pdf.text(text.toUpperCase(), MARGIN, this.y);
    this.y += 7;
    pdf.setDrawColor(...AMBER);
    pdf.setLineWidth(1.4);
    pdf.line(MARGIN, this.y, MARGIN + 34, this.y);
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN + 34, this.y, PAGE_W - MARGIN, this.y);
    this.y += 16;
  }

  paragraph(text: string, options?: { size?: number; muted?: boolean; indent?: number; bold?: boolean }) {
    const size = options?.size ?? 9.5;
    const indent = options?.indent ?? 0;
    const pdf = this.pdf;
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    ink(pdf, options?.muted ? MUTED : INK);
    const lines = pdf.splitTextToSize(text, CONTENT_W - indent) as string[];
    for (const line of lines) {
      this.ensure(size + 5);
      pdf.text(line, MARGIN + indent, this.y);
      this.y += size + 4;
    }
  }

  mono(text: string, indent = 0) {
    const pdf = this.pdf;
    pdf.setFont("courier", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...INK);
    const lines = (pdf.splitTextToSize(text || "—", CONTENT_W - indent - 16) as string[]).slice(0, 8);
    const height = lines.length * 10 + 10;
    this.ensure(height);
    pdf.setFillColor(...PANEL);
    pdf.setDrawColor(...RULE);
    pdf.rect(MARGIN + indent, this.y - 8, CONTENT_W - indent, height, "FD");
    for (const line of lines) {
      pdf.text(line, MARGIN + indent + 8, this.y + 2);
      this.y += 10;
    }
    this.y += 8;
    pdf.setFont("helvetica", "normal");
  }

  keyValues(rows: Array<[string, string]>) {
    const pdf = this.pdf;
    const labelW = 150;
    for (const [label, value] of rows) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const lines = pdf.splitTextToSize(value, CONTENT_W - labelW) as string[];
      this.ensure(Math.max(14, lines.length * 12 + 4));
      pdf.setTextColor(...MUTED);
      pdf.text(label, MARGIN, this.y);
      pdf.setTextColor(...INK);
      let offset = this.y;
      for (const line of lines) {
        pdf.text(line, MARGIN + labelW, offset);
        offset += 12;
      }
      this.y = offset + 3;
    }
  }
}

/**
 * Builds a print-ready containment report for one live agent run: what the
 * agent tried, what the policy decided, and whether anything escaped.
 */
export function buildRunReport(input: RunReportInput): { blob: Blob; filename: string } {
  const { plan, results } = input;
  const doc = new Doc();
  const pdf = doc.pdf;

  const entries = plan.steps
    .map((step, index) => ({ step, index, result: results[index] }))
    .filter((entry) => entry.result) as Array<{
    step: AgentRunPlan["steps"][number];
    index: number;
    result: ReportStepResult;
  }>;

  const blocked = entries.filter((e) => e.result.verdict === "deny").length;
  const held = entries.filter((e) => e.result.verdict === "needs_approval").length;
  const allowed = entries.filter((e) => e.result.verdict === "allow").length;
  const escaped = entries.filter((e) => !e.result.enforced && e.result.intended_verdict !== "allow").length;
  const risky = entries.filter((e) => e.result.intended_verdict !== "allow").length;
  const sealed = escaped === 0;
  const notRun = plan.steps.length - entries.length;
  const highest = entries.reduce((max, e) => Math.max(max, e.result.risk_score), 0);

  const repoLabel = `${plan.repo.owner}/${plan.repo.repo}`;
  const generatedAt = new Date();
  doc.reportId = `CR-${generatedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.abs(
    hash(`${repoLabel}${input.startedAt ?? generatedAt.toISOString()}`),
  )
    .toString(36)
    .slice(0, 6)
    .toUpperCase()}`;
  doc.repo = repoLabel;

  /* ---------- Cover block ---------- */
  pdf.setFillColor(...INK);
  pdf.rect(0, 0, PAGE_W, 132, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...AMBER);
  pdf.text("CONTAINMENT", MARGIN, 46);
  pdf.setFontSize(21);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Agent Containment Report", MARGIN, 76);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(196, 198, 204);
  pdf.text(`Live run against ${repoLabel}`, MARGIN, 96);
  pdf.setFontSize(8);
  pdf.text(`Report ${doc.reportId}  ·  Generated ${stamp(generatedAt.toISOString())}`, MARGIN, 112);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  ink(pdf, sealed ? [140, 220, 170] : [240, 150, 150]);
  pdf.text(sealed ? "SANDBOX SEALED" : "ESCAPE GOT THROUGH", PAGE_W - MARGIN, 76, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(196, 198, 204);
  pdf.text("Confidential — internal security record", PAGE_W - MARGIN, 96, { align: "right" });

  doc.y = 168;

  /* ---------- Report metadata ---------- */
  doc.heading("Report details");
  doc.keyValues([
    ["Report ID", doc.reportId],
    ["Prepared for", input.operator || "Containment workspace"],
    ["Repository", `${plan.repo.url}`],
    [
      "Repository profile",
      `${plan.repo.language ?? "language not detected"} · ${plan.repo.file_count} files · ${plan.repo.stars} stars · default branch ${plan.repo.default_branch}`,
    ],
    ["Setup files read", plan.repo.scanned_files.join(", ") || "none found"],
    ["Run started", stamp(input.startedAt)],
    ["Run finished", stamp(input.finishedAt)],
    [
      "Policy in force",
      `version ${input.policyVersion ?? "—"} · ${input.policyMode === "monitor" ? "monitor (log only)" : "enforce (blocking)"}`,
    ],
    ["Actions evaluated", `${entries.length} of ${plan.steps.length}${notRun ? ` (${notRun} not reached)` : ""}`],
  ]);

  /* ---------- Executive summary ---------- */
  doc.heading("Executive summary");
  doc.paragraph(
    `An autonomous agent was given the ${repoLabel} repository and asked to install, build and run it. Every action it proposed was submitted to the Containment policy engine before execution. ${entries.length} action${entries.length === 1 ? "" : "s"} were evaluated: ${allowed} allowed, ${held} held for human approval and ${blocked} blocked outright. ${risky} of them were genuinely dangerous — attempted sandbox escapes such as credential access, writes outside the workspace, or egress to hosts outside the allowlist.`,
  );
  doc.space(4);
  doc.paragraph(
    sealed
      ? `Containment held. No action that the engine judged unsafe was permitted to execute, so the sandbox boundary was never crossed during this run. The highest risk score recorded was ${highest}/100.`
      : `Containment did not hold. ${escaped} unsafe action${escaped === 1 ? "" : "s"} executed because the policy was in monitor mode, which records verdicts without enforcing them. Switching the policy to enforce mode would have stopped ${escaped === 1 ? "it" : "them"}. The highest risk score recorded was ${highest}/100.`,
    { bold: true },
  );

  /* ---------- Status + counters ---------- */
  doc.heading("Containment status");
  doc.ensure(96);
  const statusColor = sealed ? GREEN : RED;
  stroke(pdf, statusColor);
  pdf.setLineWidth(1);
  pdf.setFillColor(...PANEL);
  pdf.rect(MARGIN, doc.y, CONTENT_W, 76, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  ink(pdf, statusColor);
  pdf.text(sealed ? "SANDBOX SEALED" : "ESCAPE GOT THROUGH", MARGIN + 18, doc.y + 30);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK);
  const statusLines = pdf.splitTextToSize(
    sealed
      ? "Every risky action this agent attempted was stopped or referred to a human before it could run."
      : "At least one risky action executed. The policy recorded it but did not block it.",
    CONTENT_W - 36,
  ) as string[];
  let sy = doc.y + 48;
  for (const line of statusLines) {
    pdf.text(line, MARGIN + 18, sy);
    sy += 12;
  }
  doc.y += 92;

  const counters: Array<[string, number, readonly number[]]> = [
    ["Blocked", blocked, RED],
    ["Held for approval", held, AMBER],
    ["Allowed", allowed, GREEN],
    ["Escaped", escaped, escaped ? RED : MUTED],
  ];
  doc.ensure(64);
  const cellW = CONTENT_W / counters.length;
  counters.forEach(([label, value, color], i) => {
    const x = MARGIN + i * cellW;
    pdf.setDrawColor(...RULE);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, doc.y, cellW, 52, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(color[0]!, color[1]!, color[2]!);
    pdf.text(String(value), x + cellW / 2, doc.y + 26, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    pdf.text(label.toUpperCase(), x + cellW / 2, doc.y + 42, { align: "center" });
  });
  doc.y += 68;
  doc.paragraph(
    "Blocked: the engine denied the action and the agent never ran it. Held for approval: the action was risky but not conclusive, so it waited for a human decision. Allowed: routine work consistent with the policy. Escaped: the engine judged the action unsafe but the policy was not enforcing, so it ran anyway.",
    { size: 8, muted: true },
  );

  /* ---------- Policy of record ---------- */
  doc.heading("Policy applied during this run");
  doc.keyValues([
    ["Enforcement mode", input.policyMode === "monitor" ? "Monitor — verdicts logged, nothing blocked" : "Enforce — denied actions are stopped"],
    ["Policy version", input.policyVersion ? `v${input.policyVersion}` : "—"],
    ["Deny threshold", `${plan.policy.deny_threshold}/100 risk and above is blocked`],
    ["Approval threshold", `${plan.policy.approval_threshold}/100 risk and above needs a human`],
    ["Vectors guarded", vectorList(plan)],
    ["Allowed egress hosts", plan.policy.allowed_hosts.join(", ") || "none — all outbound calls are flagged"],
    ["Writable roots", plan.policy.allowed_write_paths.join(", ") || "none — all writes are flagged"],
    ["Approval-gated tools", plan.policy.approval_required_tools.join(", ") || "none"],
  ]);
  if (plan.policy.rationale) {
    doc.space(4);
    doc.paragraph(`Rationale for this repository: ${plan.policy.rationale}`, { size: 8.5, muted: true });
  }

  /* ---------- Audit trail summary table ---------- */
  doc.heading("Audit trail summary");
  doc.paragraph(
    "Each row is one decision written to the audit trail, in the order the agent attempted it. Risk is the engine's 0–100 score; rules is the number of policy rules that fired.",
    { size: 8.5, muted: true },
  );
  doc.space(6);
  drawTableHeader(doc);
  entries.forEach((entry) => {
    drawTableRow(doc, entry);
  });
  if (notRun > 0) {
    doc.space(6);
    doc.paragraph(
      `${notRun} planned action${notRun === 1 ? " was" : "s were"} never evaluated because the run stopped early (a blocked action or a pending approval ended the sequence).`,
      { size: 8.5, muted: true },
    );
  }

  /* ---------- Findings detail ---------- */
  doc.heading("Decision detail and rule findings");
  doc.paragraph(
    "The full reasoning behind every decision, including the exact action text and each rule that contributed to the risk score.",
    { size: 8.5, muted: true },
  );
  entries.forEach((entry) => {
    doc.ensure(90);
    doc.space(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    doc.paragraph(`${entry.index + 1}. ${entry.step.title}`, { bold: true, size: 10 });
    const color = verdictColor(entry.result.verdict);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(color[0]!, color[1]!, color[2]!);
    doc.ensure(14);
    pdf.text(
      `${VERDICT_LABEL[entry.result.verdict]}  ·  risk ${entry.result.risk_score}/100  ·  ${entry.result.action_type}${
        entry.result.enforced ? "" : "  ·  NOT ENFORCED (monitor mode)"
      }`,
      MARGIN,
      doc.y,
    );
    doc.y += 14;
    doc.paragraph(`Why the agent wanted this: ${entry.step.why}`, { size: 8.5, muted: true });
    doc.mono(actionLine(entry.step.action));
    if (entry.step.action.untrusted_context) {
      doc.paragraph(`Influenced by untrusted content: "${entry.step.action.untrusted_context}"`, {
        size: 8.5,
        muted: true,
      });
      doc.space(2);
    }
    doc.paragraph(`Engine summary: ${entry.result.summary}`, { size: 8.5 });
    if (entry.result.findings.length === 0) {
      doc.paragraph("No rules fired — this action matched the policy's allowed behaviour.", {
        size: 8.5,
        muted: true,
        indent: 12,
      });
    } else {
      entry.result.findings.forEach((finding: Finding) => {
        doc.space(2);
        doc.paragraph(
          `• ${finding.title}  [${finding.rule} · ${finding.vector} · +${finding.score}${finding.hard ? " · hard block" : ""}]`,
          { size: 8.5, bold: true, indent: 12 },
        );
        doc.paragraph(finding.detail, { size: 8.5, muted: true, indent: 22 });
        if (finding.evidence) doc.paragraph(`Evidence: ${finding.evidence}`, { size: 8, muted: true, indent: 22 });
        if (finding.remediation) doc.paragraph(`Remediation: ${finding.remediation}`, { size: 8, muted: true, indent: 22 });
      });
    }
    if (entry.result.decision_id) {
      doc.space(2);
      doc.paragraph(`Audit record: ${entry.result.decision_id}`, { size: 7.5, muted: true });
    }
    doc.space(4);
    doc.ensure(8);
    pdf.setDrawColor(...RULE);
    pdf.line(MARGIN, doc.y, PAGE_W - MARGIN, doc.y);
  });

  /* ---------- Recommendations ---------- */
  doc.heading("Recommended actions");
  const recommendations: string[] = [];
  if (!sealed)
    recommendations.push(
      "Switch the policy to enforce mode. In monitor mode the engine records unsafe actions but the agent still executes them.",
    );
  if (held > 0)
    recommendations.push(
      `Resolve the ${held} held action${held === 1 ? "" : "s"} in the approval queue. Each one carries an AI reviewer recommendation plus the rules that fired.`,
    );
  if (blocked > 0)
    recommendations.push(
      "Review the blocked actions with the team that owns this agent — a legitimate build step being blocked usually means the allowlists need one narrow addition, not a lower threshold.",
    );
  recommendations.push(
    "Keep the allowlists as tight as this run proved workable, and re-run this report after any policy change so you have a dated before/after record.",
  );
  recommendations.push(
    "Deploy the same policy in front of your real agent using an agent key, so production actions are checked by the exact rules verified here.",
  );
  recommendations.forEach((text, i) => {
    doc.paragraph(`${i + 1}. ${text}`, { size: 9 });
    doc.space(3);
  });

  doc.space(10);
  doc.paragraph(
    `Generated by Containment on ${stamp(generatedAt.toISOString())}. This report reflects policy version ${input.policyVersion ?? "—"} and the audit records listed above; both are retained in the workspace audit trail.`,
    { size: 8, muted: true },
  );

  doc.footer();

  const filename = `containment-report-${plan.repo.owner}-${plan.repo.repo}-${generatedAt
    .toISOString()
    .slice(0, 10)}.pdf`;
  return { blob: pdf.output("blob"), filename };
}

function vectorList(plan: AgentRunPlan): string {
  const on: string[] = [];
  if (plan.policy.block_shell) on.push("shell execution");
  if (plan.policy.block_filesystem) on.push("filesystem");
  if (plan.policy.block_network) on.push("network egress");
  if (plan.policy.block_injection) on.push("prompt injection & tool abuse");
  return on.length ? on.join(", ") : "none — every vector is monitoring only";
}

const COLS = [26, 210, 74, 84, 44, 40];

function drawTableHeader(doc: Doc) {
  const pdf = doc.pdf;
  doc.ensure(26);
  pdf.setFillColor(...INK);
  pdf.rect(MARGIN, doc.y, CONTENT_W, 20, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  const labels = ["#", "Action", "Type", "Verdict", "Risk", "Rules"];
  let x = MARGIN + 6;
  labels.forEach((label, i) => {
    pdf.text(label.toUpperCase(), x, doc.y + 13);
    x += COLS[i]!;
  });
  doc.y += 20;
}

function drawTableRow(
  doc: Doc,
  entry: { step: AgentRunPlan["steps"][number]; index: number; result: ReportStepResult },
) {
  const pdf = doc.pdf;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const title = pdf.splitTextToSize(entry.step.title, COLS[1]! - 8) as string[];
  const detail = pdf.splitTextToSize(actionLine(entry.step.action) || "—", COLS[1]! - 8) as string[];
  const lines = [...title.slice(0, 2), ...detail.slice(0, 2)];
  const height = Math.max(22, lines.length * 10 + 8);

  if (doc.y + height > PAGE_H - MARGIN - 38) {
    doc.ensure(PAGE_H);
    drawTableHeader(doc);
  }

  pdf.setDrawColor(...RULE);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(MARGIN, doc.y, CONTENT_W, height, "FD");

  const baseline = doc.y + 13;
  let x = MARGIN + 6;
  pdf.setTextColor(...MUTED);
  pdf.text(String(entry.index + 1), x, baseline);
  x += COLS[0]!;

  let ty = baseline;
  title.slice(0, 2).forEach((line) => {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...INK);
    pdf.text(line, x, ty);
    ty += 10;
  });
  detail.slice(0, 2).forEach((line) => {
    pdf.setFont("courier", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    pdf.text(line, x, ty);
    ty += 10;
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  x += COLS[1]!;

  pdf.setTextColor(...MUTED);
  pdf.text(entry.result.action_type, x, baseline);
  x += COLS[2]!;

  const color = verdictColor(entry.result.verdict);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(color[0]!, color[1]!, color[2]!);
  pdf.text(VERDICT_LABEL[entry.result.verdict], x, baseline);
  if (!entry.result.enforced && entry.result.intended_verdict !== "allow") {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...RED);
    pdf.text("escaped (monitor)", x, baseline + 10);
    pdf.setFontSize(8);
  }
  x += COLS[3]!;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...INK);
  pdf.text(`${entry.result.risk_score}`, x, baseline);
  x += COLS[4]!;
  pdf.setTextColor(...MUTED);
  pdf.text(String(entry.result.findings.length), x, baseline);

  doc.y += height;
}

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) | 0;
  return out;
}
