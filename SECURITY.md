# Security Policy

## Overview

Containment is a security-focused firewall for AI agent actions. This document describes our security posture, recent hardening measures, and how to report vulnerabilities.

## Recent Security Hardening (2026-09)

### Environment Variables and Secrets Management

- **Removed committed secrets**: `.env` file containing Supabase credentials has been removed from git history
- **Added `.env.example`**: Template file with placeholder values for required environment variables
- **Enhanced `.gitignore`**: Now explicitly blocks `.env` and `.env.*` files (except `.env.example`)
- **Note**: Supabase anon/publishable keys are considered low-risk as they're designed for client-side use, but we've removed them from the repository as a defense-in-depth measure

### API Security

#### CORS Configuration

- **Environment-driven allowlist**: CORS now respects `ALLOWED_ORIGINS` environment variable
- **Development flexibility**: Empty `ALLOWED_ORIGINS` allows all origins (default for dev)
- **Production lockdown**: Set `ALLOWED_ORIGINS` to a comma-separated list of approved origins for production deployments

#### Security Headers

All API responses now include:

- `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` - Limits referrer information leakage

#### Fail-Closed Behavior

- **Policy evaluation errors**: If the policy engine throws an exception, the action is **automatically denied** (verdict: `deny`, risk_score: 100)
- **Database errors**: API returns appropriate HTTP error codes without allowing actions through
- **No silent failures**: All error paths are logged to the audit trail

### Database Security

#### Row Level Security (RLS)

All tables enforce RLS with user-scoped policies:

- `profiles` - Users can only access their own profile
- `policies` - Users can only access their own policies
- `api_keys` - Users can only access their own API keys
- `decisions` - Users can only access their own decision history
- `policy_versions` - Users can only access versions of their own policies
- `flow_sessions` - Users can only access their own flow sessions

#### Function Security

- `handle_new_user()` - Runs as `SECURITY DEFINER` with controlled `search_path`
- `touch_updated_at()` - Runs with `search_path = public` for safety
- Both functions explicitly `REVOKE` permissions from `PUBLIC`, `anon`, and `authenticated` roles

### Input Validation and Injection Prevention

#### Policy Engine Protections

The guard engine includes comprehensive detection for:

- **Shell injection**: Reverse shells, command obfuscation, privilege escalation, credential harvesting
- **Path traversal**: `..` sequences, URL encoding, symbolic link exploitation
- **SSRF**: Cloud metadata endpoints (169.254.169.254, etc.), private IP ranges, DNS rebinding services
- **Prompt injection**: Instruction override, role hijacking, secret solicitation, hidden payloads
- **Encoding tricks**: Commands are normalized (unquoted, backslash-escaped) before pattern matching

#### Input Sanitization

- **Action schema validation**: All incoming actions are validated via Zod schemas before processing
- **Type safety**: TypeScript enum for action types prevents case tricks
- **Length limits**: All string fields have maximum length constraints (commands: 20KB, content: 200KB)
- **Case normalization**: Hostnames and patterns are compared case-insensitively where appropriate

### Frontend Security

#### XSS Prevention

- **No dangerous innerHTML**: The codebase uses React's safe rendering by default
- **Single controlled exception**: `dangerouslySetInnerHTML` in `chart.tsx` is limited to CSS generation from a controlled config object (not user input)
- **Type-safe templating**: React JSX prevents injection in dynamic content

### Dependency Management

- **Dependabot enabled**: Weekly automated security updates for npm dependencies
- **Grouped updates**: Minor/patch updates are grouped by production vs development for easier review
- **Manual major updates**: Major version bumps require explicit review

## Residual Security Considerations

### Known Limitations

1. **Pattern-based detection**: The policy engine uses regex patterns which may not catch novel attack vectors
2. **No rate limiting**: The API currently has no built-in rate limiting (recommend adding at the infrastructure level)
3. **No request signing**: API keys are bearer tokens without request signing (consider HMAC signatures for high-security use cases)
4. **Limited DDoS protection**: Recommend adding infrastructure-level protections (e.g., CloudFlare, AWS WAF)
5. **No CSP headers**: Content Security Policy is not configured (low priority for API-first application)
6. **Service account permissions**: `service_role` has full database access (Supabase default; consider tightening in production)

### Recommended Production Hardening

1. **Set `ALLOWED_ORIGINS`**: Never deploy with wildcard CORS in production
2. **Enable rate limiting**: Use a reverse proxy or API gateway with rate limits
3. **Add request signing**: Consider implementing HMAC signatures for API requests
4. **Monitor audit logs**: Set up alerts on `decisions` table for high-risk actions
5. **Regular security audits**: Review `decisions` and `api_keys` tables for anomalies
6. **Rotate keys**: Implement periodic API key rotation policies
7. **Infrastructure security**: Use VPC, security groups, and network ACLs to limit database access
8. **Secrets management**: Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) for production credentials

### Simulated Attack Scenarios

This repository contains **simulated** attack examples for demonstration purposes only:

- All attack patterns in the policy engine are for **detection**, not execution
- Demo scenarios do not contain real exploit code
- The system is designed to **block** these patterns, not enable them

## Reporting a Vulnerability

If you discover a security vulnerability in Containment, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the security team with details:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested remediation (if known)
3. Allow reasonable time for a fix before public disclosure
4. We will acknowledge receipt within 48 hours
5. We will provide a timeline for a fix within 7 days

### Scope

**In scope:**

- Authentication bypass
- Authorization bypass (accessing other users' data)
- SQL injection
- XSS or other client-side injection
- API abuse or rate limiting issues
- Cryptographic vulnerabilities
- Information disclosure

**Out of scope:**

- Social engineering
- Physical attacks
- Denial of service (unless critical)
- Issues in third-party dependencies (report to upstream maintainers)
- Theoretical attacks without proof of concept

## Security Best Practices for Users

### For Operators

1. **Guard your API keys**: Treat them like passwords; never commit them to git
2. **Use enforce mode**: Set policies to `mode: enforce` in production
3. **Review approval queue**: Regularly review actions that require human approval
4. **Monitor risk scores**: Set up alerts for actions with risk scores above your threshold
5. **Update regularly**: Keep Containment and its dependencies up to date

### For Developers

1. **Never bypass the guard**: Always route agent actions through the Containment API
2. **Log all decisions**: Ensure every agent action is logged to the audit trail
3. **Validate untrusted content**: Mark any LLM-ingested content with `untrusted_context`
4. **Test your policies**: Use the policy test runner before deploying new rules
5. **Fail closed**: If the Containment API is unreachable, **deny** the action by default

## Compliance and Standards

Containment follows security best practices aligned with:

- OWASP Top 10 (Web Application Security)
- OWASP API Security Top 10
- CWE/SANS Top 25 Most Dangerous Software Weaknesses
- NIST Cybersecurity Framework

## Version History

- **2026-09-28**: Initial security hardening pass (secrets, CORS, fail-closed, headers, RLS audit, Dependabot)
- **2026-08-14**: Flow sessions RLS and archival support
- **2026-08-09**: AI risk advisor integration
- **2026-08-05**: Flow sessions and onboarding added
- **2026-08-04**: Initial RLS policies and policy versioning
- **2026-08-04**: Core guard engine and decision logging

## Contact

For security inquiries: [Your security contact email]

For general support: [Your support contact]
