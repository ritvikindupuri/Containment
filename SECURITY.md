# Security Policy

## Overview

Containment is a production-grade, security-hardened AI agent action firewall. This document describes the comprehensive security controls implemented, deployment requirements, and residual considerations.

## Comprehensive Security Hardening

### 1. Secrets Management ✅

- **No committed secrets**: All credentials removed from git history
- **Environment variables**: `.env` blocked via `.gitignore` with `.env.example` template
- **Secret redaction**: All logs automatically redact AWS keys, API tokens, JWTs, private keys
- **No secrets in responses**: Errors return generic messages; sensitive details stay server-side

### 2. API Security Hardening ✅

#### CORS (Fail-Closed)
- **Production**: CORS **denies all origins** when `ALLOWED_ORIGINS` is unset (fail-closed)
- **Development**: Allows `*` when `ALLOWED_ORIGINS` is empty for local dev flexibility
- **Per-origin validation**: Each request's `Origin` header validated against comma-separated allowlist

#### Rate Limiting
- **Per-user limits**: 100 requests/minute per authenticated user
- **Per-IP limits**: 200 requests/minute per source IP
- **429 responses**: Includes `retry_after` seconds in error response
- **Fail-open on errors**: Rate limiting failures don't block requests (availability over security)

#### Security Headers (All Responses)
- `X-Content-Type-Options: nosniff` - MIME-sniffing protection
- `X-Frame-Options: DENY` - Clickjacking protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer leakage mitigation
- `Permissions-Policy` - Disables geolocation, microphone, camera, payment APIs
- `Cross-Origin-Opener-Policy: same-origin` - Process isolation
- `Cross-Origin-Embedder-Policy: require-corp` - Embedding protection
- `Cross-Origin-Resource-Policy: same-origin` - Resource isolation
- `Strict-Transport-Security` (production only): HSTS with 1-year max-age and preload

#### Content Security Policy (HTML Responses)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```
*Note: `unsafe-eval` required for Vite dev mode; remove if using production builds only*

### 3. Fail-Closed Behavior ✅

#### Policy Engine
- **Unknown action types**: Automatically denied with score 100
- **Evaluation exceptions**: Any throw → deny verdict, logged to audit trail
- **Case normalization**: Action types normalized to lowercase before matching
- **Encoding normalization**: Commands unquoted, paths decoded/normalized before checks

#### Error Handling
- **No silent failures**: All error paths explicitly deny or return errors
- **Generic client errors**: Internal errors return "An error occurred processing your request"
- **Detailed server logs**: Full errors logged server-side with secret redaction

### 4. Authorization & Authentication ✅

#### Every Function Verified
- **JWT validation**: All authenticated routes verify `auth.uid()` via Supabase RLS
- **Ownership checks**: API verifies `policy.user_id === key.user_id` before evaluation
- **Row Level Security**: Every table enforces user ownership via RLS policies

#### RLS on All Tables
| Table | Policy | Enforcement |
|-------|--------|-------------|
| `profiles` | `profiles_own` | `auth.uid() = id` |
| `policies` | `policies_own` | `auth.uid() = user_id` |
| `api_keys` | `api_keys_own` | `auth.uid() = user_id` |
| `decisions` | `decisions_select_own` | `auth.uid() = user_id` (SELECT only) |
| `decisions` | `decisions_insert_own` | `auth.uid() = user_id` (INSERT only) |
| `policy_versions` | `policy_versions_select_own` | `auth.uid() = user_id` (SELECT) |
| `policy_versions` | `policy_versions_insert_own` | `auth.uid() = user_id` (INSERT) |
| `flow_sessions` | `flow_sessions_own` | `auth.uid() = user_id` |

### 5. Append-Only Tamper-Evident Audit Trail ✅

#### Hash Chain Implementation
- **SHA256 hash chain**: Each decision includes `prev_hash` and `row_hash`
- **Automatic**: Trigger computes hash on insert: `SHA256(prev_hash || id || user_id || policy_id || action_type || verdict || risk_score || timestamp)`
- **Append-only**: `decisions` table does NOT allow UPDATE or DELETE for authenticated users
- **Immutable audit log**: Service role can modify for maintenance; users cannot tamper
- **Per-user chains**: Hash chain is separate per user for verification isolation

#### Verification
To verify chain integrity:
```sql
SELECT id, prev_hash, row_hash, created_at,
  compute_decision_hash(prev_hash, id, user_id, policy_id, 
    action_type::TEXT, verdict::TEXT, risk_score, created_at) as expected_hash,
  row_hash = compute_decision_hash(prev_hash, id, user_id, policy_id, 
    action_type::TEXT, verdict::TEXT, risk_score, created_at) as valid
FROM decisions
WHERE user_id = '<user_id>'
ORDER BY created_at, id;
```

### 6. Input Validation & Injection Prevention ✅

#### Schema Validation
- **Strict schemas**: Zod schemas reject unknown properties (`.strict()`)
- **Type enforcement**: Enum for action types prevents invalid values
- **Length limits**: Commands (20KB), content (200KB), paths (4KB), URLs (4KB)
- **Trimming**: All string fields trimmed to prevent whitespace bypasses

#### Pattern Matching (Policy Engine)
- **Shell**: Reverse shells, obfuscation, privilege escalation, credential harvesting, metadata endpoints
- **Filesystem**: Path traversal, sensitive files (.ssh, .aws, .env), kernel interfaces, runtime sockets
- **Network**: SSRF (metadata, private IPs), DNS rebinding, encoded hosts, allowlist enforcement
- **Injection**: Instruction override, role hijack, secret solicitation, embedded commands, hidden payloads

#### Normalization
- **Shell commands**: Unquoted, backslashes removed, `${IFS}` → space, multiple spaces collapsed
- **File paths**: URL-decoded, backslashes → slashes, `..` resolved, absolute paths normalized
- **Hostnames**: Lowercased, trailing dots removed
- **Action types**: Lowercased before switch statement

### 7. Prompt Injection Defenses ✅

#### Detection
- **Untrusted context tracking**: `untrusted_context` field flags LLM-ingested content
- **Tool call correlation**: If mutating tool + injection patterns → 90-point "injection-driven mutation" finding
- **URL extraction**: URLs in tool args + injection flags → 55-point "URL from untrusted" finding
- **Secret extraction**: Patterns for "print your API key" etc. flagged

#### Deterministic Overrides
- **Hard denials cannot be overridden**: If `finding.hard === true`, verdict is `deny` regardless of AI reasoning
- **Thresholds enforced**: Risk scores ≥ `deny_threshold` → deny, ≥ `approval_threshold` → needs_approval
- **Evaluation failures**: Any exception → automatic deny (cannot be bypassed by malicious input)

### 8. XSS Prevention ✅

- **React safe rendering**: All dynamic content rendered via React (auto-escapes)
- **No `dangerouslySetInnerHTML`**: Except `chart.tsx` CSS generation from controlled config (not user input)
- **CSP frame-ancestors 'none'**: Prevents embedding attacks
- **No user-controlled `innerHTML`**: Codebase audited, none found

### 9. Dependency Management ✅

#### Dependabot
- **Weekly scans**: Automated PRs for minor/patch updates (grouped)
- **Manual major updates**: Major versions require explicit review
- **Production vs dev grouped**: Easier triage

#### GitHub Actions CI
- **Secret scanning**: Gitleaks on every push (fails on secrets found)
- **Dependency audit**: `npm audit --audit-level=high` fails on high/critical vulns
- **Lint & type check**: ESLint + TypeScript checks enforce code quality
- **Build verification**: Every PR must build successfully
- **Pinned actions**: All GitHub Actions pinned to commit SHAs for supply chain security

### 10. HTTPS & Transport Security ✅

- **HSTS in production**: 1-year max-age with includeSubDomains and preload
- **TLS enforcement**: All Supabase connections via HTTPS/WSS
- **Secure cookies**: Supabase auth uses secure, httpOnly, SameSite cookies (handled by Supabase SDK)

## Production Deployment Requirements

### Required Environment Variables

```bash
# Supabase (required)
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# CORS Allowlist (REQUIRED in production, fail-closed if unset)
ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com"
```

### Deployment Checklist

- [ ] Set `ALLOWED_ORIGINS` to approved domains (fail-closed if empty)
- [ ] Run database migrations (including hash chain migration)
- [ ] Verify RLS policies are enabled on all tables
- [ ] Configure secrets in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Set up monitoring for high-risk decisions (risk_score ≥ 80)
- [ ] Configure alerts for rate limit threshold breaches
- [ ] Enable Supabase database backups
- [ ] Test hash chain verification on a sample of decisions
- [ ] Verify HSTS header is present in production responses
- [ ] Confirm CSP does not block legitimate resources

## Residual Security Considerations

### Items Requiring Manual Configuration

1. **Infrastructure-Level DDoS Protection**
   - **What**: Large-scale volumetric attacks can overwhelm application rate limiting
   - **Manual step**: Deploy behind CloudFlare (recommended), AWS CloudFront + WAF, or equivalent CDN with DDoS protection enabled
   - **Why not in code**: Requires infrastructure/DNS configuration outside application

2. **API Key Rotation Policy**
   - **What**: Long-lived API keys increase compromise window
   - **Manual step**: Implement organizational policy for periodic key rotation (recommend 90 days). Users can revoke/regenerate via UI but policy is not enforced
   - **Why not in code**: Business policy decision; expiration dates could be added to schema but rotation is a process, not code

3. **Supabase Service Role Lockdown**
   - **What**: `service_role` has full database access (Supabase default for admin operations)
   - **Manual step**: If using service role for non-admin operations, create a restricted role with minimal grants
   - **Why not in code**: Supabase platform configuration; service role needed for RLS bypass in legitimate admin operations

4. **Database Backup & Disaster Recovery**
   - **What**: Point-in-time recovery for data loss or corruption
   - **Manual step**: Enable Supabase automatic backups (daily), configure backup retention policy, test restore procedures
   - **Why not in code**: Supabase project setting, not application code

5. **Log Aggregation & SIEM**
   - **What**: Centralized logging for security event correlation and alerting
   - **Manual step**: Forward application logs to SIEM (Splunk, ELK, Datadog, etc.), configure alerting rules for high-risk events
   - **Why not in code**: External system integration requiring org-specific SIEM setup

6. **Incident Response Plan**
   - **What**: Documented procedures for security incidents (key compromise, policy bypass, etc.)
   - **Manual step**: Document playbook: who to notify, how to revoke keys, how to audit decisions, evidence preservation
   - **Why not in code**: Organizational process, not technical control

### Known Technical Limitations

1. **Pattern-Based Detection**
   - **Limitation**: Policy engine uses regex patterns; novel attack vectors may evade detection
   - **Mitigation**: Hash chain audit trail provides forensic evidence; monitor new attack techniques and update patterns
   - **Improvement path**: Add ML-based anomaly detection as future enhancement

2. **Rate Limiting Granularity**
   - **Limitation**: Per-user and per-IP only; sophisticated attackers with many IPs can distribute load
   - **Mitigation**: Infrastructure-level DDoS protection (see #1), monitor aggregate throughput
   - **Improvement path**: Add per-endpoint, per-policy-id, and time-of-day aware rate limiting

3. **No Request Signing**
   - **Limitation**: API keys are bearer tokens; if intercepted, can be replayed until revoked
   - **Mitigation**: Use HTTPS (enforced), short-lived keys, monitor `last_used_at` for anomalies
   - **Improvement path**: Implement HMAC request signing (requires client library changes)

## Vulnerability Reporting

If you discover a security vulnerability in Containment:

### Do NOT
- Open a public GitHub issue
- Disclose publicly before we've issued a fix
- Test attacks on production systems you don't own

### Do
1. **Email**: security@[your-domain] with:
   - Description of the vulnerability
   - Steps to reproduce (PoC)
   - Potential impact
   - Suggested remediation (if known)
2. **Expect**: Acknowledgment within 48 hours, timeline for fix within 7 days
3. **Coordinated disclosure**: We'll coordinate public disclosure timing with you

### In Scope
- Authentication/authorization bypass
- SQL injection
- XSS or other client-side injection
- API abuse or rate limiting bypass
- Policy engine bypass
- Cryptographic vulnerabilities
- Information disclosure
- Audit trail tampering

### Out of Scope
- Social engineering
- Physical attacks
- Denial of service (unless critical)
- Issues in third-party dependencies (report to upstream, we'll patch)
- Theoretical attacks without PoC

## Security Best Practices

### For Operators

1. **Use enforce mode**: Set policies to `mode: enforce` in production (monitor mode logs but doesn't block)
2. **Review approval queue**: Check `decisions` where `approval_state = 'pending'` daily
3. **Monitor risk scores**: Alert on `risk_score ≥ 80` for manual review
4. **Audit hash chain**: Periodically verify chain integrity with SQL verification query
5. **Rotate keys**: Revoke and regenerate API keys every 90 days
6. **Update policies**: Review and tighten `allowed_hosts`, `allowed_write_paths` quarterly

### For Developers

1. **Always route through Containment**: Never bypass the guard for "just this one action"
2. **Mark untrusted content**: Set `untrusted_context` when LLM ingests external data
3. **Log all decisions**: Every agent action must create a `decisions` row (automatic via API)
4. **Fail closed locally**: If Containment API is unreachable, **deny** the action, don't proceed
5. **Test policy changes**: Use test runner before deploying new policy rules
6. **Monitor agent behavior**: Unexpected patterns (many denials, high risk scores) indicate compromise or misconfiguration

### For Security Teams

1. **Hash chain verification**: Run integrity checks on random samples of audit log
2. **Anomaly detection**: Baseline normal risk score distribution, alert on deviations
3. **Threat intel integration**: Update policy patterns when new agent exploits are published
4. **Red team testing**: Periodically test with simulated attacks (coordinated with ops)
5. **Compliance mapping**: Map policy rules to compliance requirements (SOC2, ISO 27001, etc.)

## Compliance & Standards

Containment's security controls align with:
- **OWASP Top 10** (2021): Injection, Auth, Data Integrity
- **OWASP API Security Top 10**: Broken auth, excessive data exposure, injection, improper assets management
- **CWE Top 25**: Command injection, path traversal, improper input validation
- **NIST Cybersecurity Framework**: Identify, Protect, Detect, Respond
- **SOC 2 Type II**: Audit logging (append-only), access controls (RLS), encryption in transit (HTTPS)

## Version History

- **2026-09-28**: Full hardening pass - rate limiting, fail-closed CORS, CSP, hash chain audit, comprehensive security headers, secret redaction, GitHub Actions security, unknown action type handling
- **2026-09-28**: Initial hardening - secrets removed, CORS allowlist, fail-closed errors, Dependabot
- **2026-08-14**: Flow sessions RLS and archival
- **2026-08-09**: AI risk advisor integration
- **2026-08-05**: Flow sessions and onboarding
- **2026-08-04**: Policy versioning and RLS
- **2026-08-04**: Initial release - core guard engine and decision logging

## Support

- **Security inquiries**: security@[your-domain]
- **General support**: support@[your-domain]
- **Documentation**: See `TECHNICAL_DOCUMENTATION.md`
- **GitHub Issues**: For bugs and feature requests (not security issues)
