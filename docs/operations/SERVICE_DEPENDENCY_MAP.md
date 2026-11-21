# BIZORA — SERVICE DEPENDENCY MAP

## 1. Upstream & Downstream Component Hierarchy

```
[CLIENT BROWSERS]
        │
        ▼ (HTTPS / TCP 443)
[REVERSE PROXY / NGINX LOAD BALANCER]
        │
        ├──► [BIZORA WEB NODE 1] (Next.js 15 Standalone)
        │           │
        └──► [BIZORA WEB NODE 2] (Next.js 15 Standalone)
                    │
                    ├──► [POSTGRESQL 16 DATABASE] (Port 5432 - Critical Dependency)
                    │           └── Schema: 13 tables, composite PK (business_id, id)
                    │
                    ├──► [REDIS 7 CACHE & QUEUE] (Port 6379 - Cache Dependency)
                    │           └── Multi-tenant key cache, rate limiting, pub/sub
                    │
                    └──► [EXTERNAL AI GATEWAY] (Outbound HTTPS - Optional/Graceful)
                                └── Claude 3.5 Sonnet / Gemini 1.5 Pro
```

## 2. Failure Impact & Graceful Degradation Matrix

| Component Dependency | Failure Mode | Impact on Users | Graceful Degradation Strategy |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | Host unreachable | Platform unavailable (HTTP 503) | Circuit breaker trips; error sanitized to safe client response. |
| **Redis Cache** | Cache down | Slight latency increase | Application automatically falls back to in-memory LRU cache. |
| **External AI Gateway** | API rate-limited | Draft auto-generation pauses | System defaults to deterministic rule-based recovery templates. |
| **Single Web Node** | Process crash | Zero user impact | NGINX load balancer reroutes all traffic to healthy surviving node. |
