# BIZORA — MONITORING AND ALERTING POLICY

## 1. Golden Signals Monitored

| Golden Signal | Metric Name | Warning Threshold | Critical Threshold |
| :--- | :--- | :---: | :---: |
| **Latency** | HTTP Request Latency ($p_{95}$) | $> 250\text{ ms}$ | $> 1,000\text{ ms}$ |
| **Traffic** | Requests Per Second (RPS) | $> 500\text{ req/s}$ | $> 2,000\text{ req/s}$ |
| **Errors** | HTTP 5xx Error Rate | $> 0.5\%$ | $> 2.0\%$ |
| **Saturation** | Container CPU / Memory | $> 75\%$ | $> 90\%$ |
| **Database** | Active Connection Pool Usage | $> 70\%$ | $> 85\%$ |
| **Cache** | Cache Hit Ratio | $< 60\%$ | $< 30\%$ |

## 2. Health Probe Endpoints
- **Liveness:** `GET /api/health` — Checks container process vitality.
- **Readiness:** `GET /api/health` — Returns sub-component checks (`application`, `cache`, `database`).
- **Load Balancer Status:** `GET /healthz` — NGINX internal health indicator.

## 3. Log Aggregation & Redaction Standard
- All logs must emit structured JSON via `src/lib/logger.ts`.
- Mandatory correlation IDs: `correlationId` attached to all incoming HTTP requests.
- Strict PII & Credential Redaction: Passwords, authorization tokens, cookies, and API keys are stripped automatically via `redactSensitiveData()` prior to serialization.
