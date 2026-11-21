# BIZORA — INCIDENT RESPONSE PLAN

## 1. Severity Classifications

| Severity | Definition | Target Response (TTA) | Target Resolution (TTR) | Examples |
| :--- | :--- | :---: | :---: | :--- |
| **SEV-1 (Critical)** | Complete platform outage; data loss or corruption; security breach. | $< 15\text{ mins}$ | $< 2\text{ hours}$ | Database unreachable; auth compromised; cluster down. |
| **SEV-2 (Major)** | Major functionality impaired; significant performance degradation. | $< 30\text{ mins}$ | $< 4\text{ hours}$ | Financial aggregations failing; Redis outage; high latency. |
| **SEV-3 (Moderate)**| Non-critical feature failure; workaround available. | $< 2\text{ hours}$ | $< 24\text{ hours}$ | CSV import failure; draft formatting glitch. |
| **SEV-4 (Minor)** | Minor UI or cosmetic defect; non-impacting error. | $< 8\text{ hours}$ | Next release | Tooltip alignment; non-critical log warning. |

## 2. Incident Response Workflow

```
DETECTION ──► CLASSIFICATION ──► CONTAINMENT ──► REMEDIATION ──► POST-MORTEM
   (Alert)       (SEV-1 to 4)      (Isolate node)   (Hotfix/Rollback) (Root cause)
```

1. **Detection:** Automated alert via Prometheus/Datadog or manual operator report.
2. **Classification:** Incident Commander assigns severity level and opens incident channel.
3. **Containment:** Isolate malfunctioning node via NGINX upstream reconfiguration; fail over to healthy node.
4. **Remediation:** Apply validated hotfix or execute rollback to previous stable tag.
5. **Post-Mortem:** Author Blameless Post-Mortem within 48 hours documenting root cause and preventative backlog actions.

## 3. Emergency Contacts & Escalation Matrix
- **Incident Commander:** Lead SRE / Principal Architect
- **Database Custodian:** Principal Database Administrator
- **Security Lead:** Application Security Officer
