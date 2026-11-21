# BIZORA — DEPLOYMENT AND ROLLBACK RUNBOOK

## 1. Zero-Downtime Deployment Process (Rolling Update)

### 1.1 Pre-Deployment Verification
```bash
# 1. Run local verification suite
npm run typecheck
npm run lint
npm run test
npm run build
```

### 1.2 Rolling Container Update
```bash
# 1. Pull new verified release image
docker compose -f docker-compose.multi-server.yml pull

# 2. Update Node 1 while Node 2 serves traffic
docker compose -f docker-compose.multi-server.yml up -d --no-deps --build web_1

# 3. Wait for Node 1 to pass health probes
curl -f http://localhost:3000/api/health

# 4. Update Node 2
docker compose -f docker-compose.multi-server.yml up -d --no-deps --build web_2
```

## 2. Emergency Rollback Procedure
If errors spike or health checks fail immediately following a deployment:

```bash
# Revert immediately to previous stable Docker image tag
PREV_IMAGE="ghcr.io/kit29-25bad095/bizora:v1.0.0-rc1"

docker service update --image $PREV_IMAGE bizora_web
```
- **Database rollback:** If database migration rollback is required, restore from the pre-deployment snapshot created immediately prior to deployment.
