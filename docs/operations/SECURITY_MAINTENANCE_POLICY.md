# BIZORA — SECURITY MAINTENANCE POLICY

## 1. Vulnerability Monitoring & Patching
- **Dependency Auditing:** Automated `npm audit` and Dependabot alerts reviewed weekly. High or Critical CVEs patched within 72 hours.
- **Container Vulnerability Scanning:** Aqua Security Trivy integrated into CI/CD release workflow (`.github/workflows/release.yml`) blocking deployment on any unfixed Critical vulnerability.
- **Base Image Updates:** Official `node:22-alpine` base image rebuilt monthly to absorb upstream security patches.

## 2. Secrets Management & Rotation Policy
- **Session Secrets (`SESSION_SECRET`):** Rotated every 90 days. During rotation, both old and new secrets are supported for a 24-hour grace period via dual-key array in `sessionOptions`.
- **Database Passwords:** Managed via cloud secrets manager (AWS Secrets Manager or GCP Secret Manager) and rotated biannually.
- **API Keys (LLM Gateways):** Restricted to minimal necessary IAM permissions and rotated quarterly.

## 3. Cryptographic and Authentication Standards
- **Password Storage:** Argon2id with memory $m=65,536\text{ KB}$ (64 MB), iterations $t=3$, parallelism $p=4$, and 16-byte cryptographically secure random salt.
- **Session Security:** AES-256-GCM encryption with `HttpOnly`, `SameSite=Lax`, and `Secure` cookie attributes.
- **Tenant Isolation:** Enforced on every database access via `withTenantContext` and composite primary keys `(business_id, id)`.
