# BIZORA — OPERATIONAL CHECKLIST

## 1. Daily Operational Checks
- [ ] Verify `/api/health` status returns `healthy` across all nodes.
- [ ] Review error logs in logging aggregator for unhandled 5xx exceptions.
- [ ] Inspect database connection pool utilization (ensure $< 75\%$).
- [ ] Verify daily automated database backup completed successfully.

## 2. Weekly Operational Checks
- [ ] Run `AuditService.verifyChainIntegrity()` to confirm SHA-256 audit ledger continuity.
- [ ] Check cache hit ratio in `/api/health` telemetry (ensure $> 60\%$).
- [ ] Review slow query logs in PostgreSQL (flag queries taking $> 100\text{ ms}$).
- [ ] Check disk storage utilization on database and container volumes (ensure $< 80\%$).

## 3. Monthly Operational Checks
- [ ] Execute test restoration of latest database backup into staging environment.
- [ ] Review user access privileges and de-provision inactive business accounts.
- [ ] Scan container base images with Trivy for new Common Vulnerabilities and Exposures (CVEs).
- [ ] Review and rotate non-critical access tokens and integration credentials.
