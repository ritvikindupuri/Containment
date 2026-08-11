# Containment — Stop AI Agent Sandbox Escapes
> Your agent asks first. The escape never runs.

**Containment** is an action-level security firewall and real-time guardrail system for autonomous AI agents. By intercepting proposed terminal commands, filesystem reads/writes, HTTP network requests, and custom tool invocations before they are executed, Containment blocks indirect prompt-injection takeovers, reverse shell connection attempts, sensitive host file traversal, and cloud credential harvesting.

For a comprehensive technical deep-dive into the security models, core components, and database structures, please see our [Technical Documentation](TECHNICAL_DOCUMENTATION.md).

---

## Key Features

* **Interactive Sandbox Simulation**: Input a public GitHub repository URL, instantly clone and map its code structure, and review a tailored step-by-step action plan displaying both standard operations and realistic sandbox-escape attempts.
* **Deterministic Guard Engine**: Uses command normalization, relative path-traversal resolution, DNS rebinding detection, and context-aware prompt-injection scanning to calculate a dynamic risk score under 10ms.
* **Dynamic Security Policy & Version Control**: Instantly toggle protection vectors (Command Execution, Filesystem Access, Network Egress, Prompt Injection), set custom risk thresholds, configure domain allowlists, and track complete policy version histories.
* **Advisory AI Risk Layer**: Deterministic rules stay the enforcer; on top of them, an optional AI second opinion scores each logged action, explains it in plain English, and flags when it *disagrees* with the rule-based verdict — surfacing missing rules and false positives without ever changing a decision.
* **Human-in-the-Loop Approvals**: Pause and gate risky actions in a centralized queue, complete with an automated, context-aware AI security review suggesting clear preconditions and recommendations.
* **Security Audit Logs**: Maintain a complete, immutable history of all evaluated actions and generated verdicts, fully cross-referenced with active policy versions.
* **Printable PDF Reports**: Export fully styled, date-stamped audit logs listing containment status, risk ratios, and detailed rule-by-rule evaluations.
* **Production REST API**: Integrate Containment with any external agent framework using our high-performance HTTP endpoint and secure API keys.

---

## Sample Containment Report

Curious to see what Containment's security evaluation and action-level audit logs look like in practice?

We have compiled a comprehensive sample report demonstrating the security verdicts and simulation outcomes of our guardrail system:

👉 **[View the Sample Containment PDF Report](./containment-report-ritvikindupuri-CIRRUS_Cloud_Audit-2026-08-05.pdf)**

This sample audit report showcases:
* **Interactive Run Statistics**: Overall risk mitigation ratios, total intercepted actions, and dynamic risk scores.
* **Granular Action Logs**: Step-by-step evaluations of ordinary setup commands versus blocked sandbox-escape attempts.
* **Deterministic Guard Verdicts**: Clear rule-by-rule breakdowns demonstrating how security policies are evaluated and enforced in real-time.
* **Human-in-the-Loop Reviews**: Representative audit trails of manual approvals, rejections, and context-aware security resolutions.

---

## System Architecture

Containment uses a layered architecture to secure agent execution environments. The web application is built on TanStack React Start, and the core Guard Engine runs statelessly on an edge-ready Nitro server. The application state, policy parameters, and security logs are managed by Supabase PostgreSQL database tables.

![Containment System Architecture](https://i.imgur.com/dO3sqcK.png)
<p align="center"><em>Figure 1: Containment Real-Time Protection System Architecture Diagram</em></p>

### Flow-by-Flow Explanation

This section maps directly to the Containment architectural pipeline, detailing how policy ingestion occurs and how individual agent actions are intercepted, evaluated, and secured in real-time.

---

#### Stage 1: Repository-Guided Policy Setup (One-Time)
This stage establishes the initial boundary configuration by digesting repository metadata to build a context-aware defense posture.
1. **Ingest Repository**: The user provides a target repository URL. The backend fetches repository file hierarchies, project configurations, dependency listings, and tool configurations.
2. **Parse Codebase Structure**: The system parses the codebase structure to automatically discover legitimate operational boundaries, identifying sensitive directories, configurations, and network dependencies.
3. **Agent-Optimized Policy Generation (YAML/JSON)**: Based on discovered constraints, the policy engine constructs an agent-optimized rule profile (using JSON or YAML schemas) specifying allowed commands, network domain allowlists, write-permitted paths, and restricted tools.
4. **Policy Sign-off & Storage (Supabase/Postgres)**: The administrator reviews, tweaks, and signs off on the policy. The approved configuration is version-controlled and written directly into the Supabase PostgreSQL database under the active workspace security policy.

---

#### Stage 2: Runtime Guard Pipeline (Every Action)
For every single action an active agent attempts, the Runtime Guard Pipeline acts as an inline interceptor.
1. **Agent Action Interception (Public Guard API)**: Prior to tool or shell execution, the agent's framework intercepts the proposed action and dispatches a JSON payload containing the action category, parameters, context, and client metadata to the public Containment REST API (`/api/public/v1/guard`).
2. **Cryptographic Verification (HMAC/SHA-256)**: The gateway extracts the authentication credentials or signatures (e.g., from custom security headers) and performs rapid, secure verification against hashed keys in the Database.
3. **Content Parsing & Context Assembly**: Once verified, the engine normalizes the payload (e.g., stripping escape codes, resolving relative file paths) and matches the incoming payload parameters with the current active version of the workspace policy.

---

#### Stage 3: Decision & Enforcement
At the heart of the firewall is the real-time evaluation of risk scoring and rule matching.
1. **Policy Constraint Matching**: The parsed action parameters are checked against the deterministic policy boundaries (e.g., matching a executed shell command against binary deny-lists or checking an outgoing IP request against domain allowlists).
2. **Risk Scoring & LLM Guard Analysis**: The deterministic rules generate an base risk score (0-100). Simultaneously, an optional advisory LLM Guard layer analyzes the action's intent to detect advanced obfuscations, prompt injection, and semantic threats, providing an independent risk evaluation.
3. **Real-Time Interdiction Decision (Allow, Deny, or Escalate/Redact)**: A final action verdict is computed instantly by comparing calculated risk scores against policy thresholds:
   - **ALLOW**: If the score is below the manual approval threshold, the action is approved.
   - **DENY**: If the score exceeds the deny threshold, the execution is immediately blocked.
   - **ESCALATE / REDACT**: Borderline scores halt execution and route the request to a human-in-the-loop approval queue.

---

#### Stage 4: Audit & Evidence Storage
After a decision is rendered, Containment logs detailed artifacts to guarantee complete traceability.
1. **Encrypt Action & Evidence**: The raw action payload, associated runtime variables, and triggered rule profiles are encrypted to prevent unauthorized modification or exposure of sensitive command payloads.
2. **Write Immutable Ledger Log**: The outcome is committed to the PostgreSQL-backed audit ledger, creating a tamper-resistant record of the decision verdict, specific rule match details, and chronological timestamps.
3. **Sync with Management Console**: Real-time subscriptions push the new ledger record immediately to open dashboard sessions, providing administrators with live timeline updates.

---

#### Management Console Interactions
Administrators manage policy state and supervise operations through a secure browser interface:
* **Dashboard**: Displays high-level analytics, including real-time risk ratios, blocked threat counts, and active traffic graphs.
* **Policies**: Allows users to dynamically edit, save, and release newer versions of workspace boundaries with seamless rollbacks.
* **Approvals**: A central holding interface where paused actions are reviewed, contextual AI recommendations are generated, and operators approve or reject executions.
* **Audit History**: A complete list of all decisions, equipped with advanced filters for forensic investigation.
* **Reports**: Compiles runtime statistics and generates compliance audit documents.
* **Settings**: Manages API keys, workspace credentials, integration preferences, and user roles.

---

#### Outputs & Insights
The final stage yields actionable reports and diagnostic telemetry for downstream security teams:
* **Decision Timeline**: An interactive chronological log mapping the agent's activities and interventions step-by-step.
* **Policy Version Info**: Real-time indicators of which version of the guard policy evaluated and governed each specific action.
* **Risk Findings**: Aggregated vulnerability highlights, detailing patterns of prompt injection or system traverse attempts.
* **PDF Report**: Fully styled, branded audit documents compiling workspace configurations, metrics, and detailed decision ledgers for compliance sign-off.
* **Evidence Export**: Machine-readable JSON audits and log exports available for SIEM or external analysis pipelines.

---

## Tech Stack

* **AI & Planning Model**: [OpenAI GPT-5.6-sol](https://openai.com/) (integrated via the secure Lovable AI Gateway)
* **Frontend Framework**: [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
* **Routing & Meta-framework**: [TanStack Start](https://tanstack.com/start/latest) / [TanStack React Router](https://tanstack.com/router/latest)
* **CSS & Design**: [Tailwind CSS v4](https://tailwindcss.com/) with [Shadcn UI](https://ui.shadcn.com/) and [Lucide Icons](https://lucide.dev/)
* **Database & Auth**: [Supabase](https://supabase.com/) (Postgres DB, GoTrue Authentication, Row-Level Security)
* **PDF Engine**: [jsPDF](https://github.com/parallax/jsPDF) for generating printable reports
* **Deployment & Runtime**: [Vite](https://vite.dev/) and [Nitro Server](https://nitro.unjs.io/) (via Bun / Node.js)

---

## Detailed Setup Instructions

You can run Containment locally using **Bun** or **NPM**. Ensure you have Node.js (v18+) or Bun (v1.0+) installed before starting.

### Setup using Bun (Recommended)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   SUPABASE_PROJECT_ID="your_supabase_project_id"
   SUPABASE_URL="https://your_supabase_url.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
   VITE_SUPABASE_PROJECT_ID="your_supabase_project_id"
   VITE_SUPABASE_URL="https://your_supabase_url.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
   ```

4. **Run the Development Server**
   ```bash
   bun run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

### Setup using NPM

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_PROJECT_ID="your_supabase_project_id"
   SUPABASE_URL="https://your_supabase_url.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
   VITE_SUPABASE_PROJECT_ID="your_supabase_project_id"
   VITE_SUPABASE_URL="https://your_supabase_url.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## Detailed "How to Use" Guide

Follow these steps to run a complete simulation and connect your production agent.

### Step 1: Account Access
1. Start the application using your chosen package manager and open `http://localhost:3000`.
2. Click **Sign in** or **Contain my agent** on the landing page to access the login panel.
3. Sign up with a valid email and password, or use the pre-configured credentials if available.

### Step 2: Ingest a Repository
1. Navigate to the **Console** (`/console`) page. This page guides you through setting up a repository security policy step-by-step.
2. In the input box under **Step 1: Point us at a repository**, enter a public GitHub URL (e.g., `https://github.com/expressjs/express`) or select one of the pre-configured examples.
3. Click **Ingest Repository**. The application will analyze the repository structure and configuration files to build a custom simulation plan.

### Step 3: Approve Security Policy
1. Scroll down to **Step 2: Approve the suggested policy**.
2. Review the policy recommendations generated specifically for your repository (including custom domain allowlists and blocked execution vectors).
3. Click **Approve this policy** to apply the configuration. This policy will immediately go live as `v1`.

### Step 4: Run Manual Test Actions
1. Go to **Step 3: Try the suggested actions**.
2. Locate the suggested test cases derived from your repository.
3. Click **Run** on a safe action (such as a dependency install) to see an `ALLOW` verdict.
4. Click **Run** on a dangerous action (such as a reverse shell) to see how the engine instantly detects and blocks the threat.
5. *Optional*: Under any verdict, click **Get a second opinion** to run the advisory AI risk layer. It returns its own risk score, a plain-English read, and whether it agrees with the rule-based verdict. It never changes the verdict — use disagreements to spot a rule you should add or an allowlist entry you're missing.
6. *Optional*: Expand the custom actions menu to input your own terminal commands, filesystem paths, or simulated prompt-injection strings to test the policy rules in real-time.

### Step 5: Execute the Live Agent Run Simulation
1. Scroll to **Step 4: Watch the whole agent run** and click **Open the live run**, or navigate directly to the **Live Run** tab (`/agent-run`).
2. Click **Run Actions**. This starts a step-by-step agent simulation executing ordinary setup commands and realistic sandbox escape attempts.
3. Watch the visual timeline update in real-time.
   - Safe actions are logged as **Allowed** with low risk scores.
   - Risky actions (such as credential harvesting or network exfiltration) are instantly intercepted and **Blocked**.
   - Borderline actions are flagged as **Held for human approval**, and the simulation is paused automatically.

### Step 6: Human-in-the-Loop Approvals
1. When the simulation pauses on an action requiring approval, review the action details.
2. Click **Ask AI Reviewer** to analyze the context. The built-in security assistant will provide a recommended decision, detailed reasoning, and any safety preconditions.
3. Click **Approve** or **Reject** and add an optional resolution note.
4. If approved, the action is allowed and the simulation continues running.

### Step 7: Export PDF Reports
1. Once the simulation run completes, click **Download PDF report** on the side metrics panel.
2. The application will compile the run details, overall risk stats, active policy versions, and detailed decision tables into a formatted PDF report.

### Step 8: View the Audit Trail
1. Click the **Audit Trail** (`/dashboard`) tab.
2. Review the centralized log showing the last 200 security verdicts, risk scores, and active policy versions.
3. Filter decisions by category (**Blocked**, **Needs Approval**, or **Allowed**) using the top filtering buttons.
4. Click on any log entry to view detailed rules, evidence matches, and raw JSON payloads.

### Step 9: Configure Custom Policies
1. Navigate to the **Guard Rules** (`/policy`) tab.
2. Switch individual protection vectors on or off.
3. Adjust the **Deny** and **Approval** risk score sliders.
4. Input custom allowed domains (e.g., `api.github.com`), writable system directories, or human-gated tools.
5. Enter a change note in the **What changed?** field and click **Save as vX**. Every subsequent agent call will be evaluated against this new version.

### Step 10: Connect Your Production Agent
1. Navigate back to the **Console** (`/console`) page and scroll down to **Step 5: Deploy: connect your production agent**.
2. Enter a name for your production workspace and click **Create Key**.
3. **Copy the generated key immediately** (`agk_live_...`). It will only be displayed once for security reasons.
4. Select your preferred integration tab (**cURL**, **TypeScript**, or **Python**) to view customized code snippets.
5. Copy and paste the snippet into your production agent's tool-execution pipeline. Your agent will now query Containment for validation before executing any action.
