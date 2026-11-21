# BIZORA — PRODUCTION OPERATIONS RUNBOOK

## 1. System Overview
Bizora is a multi-tenant business intelligence and revenue recovery modular monolith built on Next.js 15, PostgreSQL 16, and Redis 7. It processes commercial transactions, identifies dormant customer risks, recovers expired quotations, and provides human-in-the-loop external communications via client-side URI protocols.

## 2. Service Management Commands

### 2.1 Starting the Services (Docker Compose)
```bash
# Start complete multi-server production cluster in detached mode
docker compose -f docker-compose.multi-server.yml up -d

# Verify container runtime states
docker compose -f docker-compose.multi-server.yml ps
```

### 2.2 Stopping and Restarting Services
```bash
# Graceful restart of web nodes
docker compose -f docker-compose.multi-server.yml restart web_1 web_2

# Full teardown preserving persistent volumes
docker compose -f docker-compose.multi-server.yml down
```

### 2.3 Inspecting Logs
```bash
# Stream aggregated logs across all nodes
docker compose -f docker-compose.multi-server.yml logs -f --tail=100

# View specific service logs
docker compose -f docker-compose.multi-server.yml logs -f web_1
docker compose -f docker-compose.multi-server.yml logs -f load_balancer
```

## 3. Routine Health Audits
- **Liveness & Readiness Endpoint:** `GET /api/health`
  - Expected: HTTP 200 with `status: "healthy"`
  - Monitored components: web app runtime, cache telemetry, uptime.
- **NGINX LB Health:** `GET http://localhost/healthz`
  - Expected: HTTP 200 `{"status":"healthy","load_balancer":"nginx"}`
