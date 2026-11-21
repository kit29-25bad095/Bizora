import { describe, it, expect } from "vitest";
import { GET } from "../src/app/api/health/route";
import fs from "node:fs";
import path from "node:path";

describe("Phase 07 — Infrastructure Foundation", () => {
  it("health endpoint returns status: healthy with HTTP 200", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("healthy");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeDefined();
  });

  it("Dockerfile specifies multi-stage build and non-root execution", () => {
    const dockerfilePath = path.resolve(__dirname, "../Dockerfile");
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const content = fs.readFileSync(dockerfilePath, "utf-8");
    expect(content).toContain("FROM node:22-alpine AS deps");
    expect(content).toContain("FROM node:22-alpine AS builder");
    expect(content).toContain("FROM node:22-alpine AS runner");
    expect(content).toContain("adduser --system --uid 1001 nextjs");
    expect(content).toContain("USER nextjs");
    expect(content).toContain("HEALTHCHECK");
  });

  it("docker-compose.yml defines web, postgres, and redis services", () => {
    const composePath = path.resolve(__dirname, "../docker-compose.yml");
    expect(fs.existsSync(composePath)).toBe(true);

    const content = fs.readFileSync(composePath, "utf-8");
    expect(content).toContain("services:");
    expect(content).toContain("web:");
    expect(content).toContain("postgres:");
    expect(content).toContain("redis:");
    expect(content).toContain("postgres:16-alpine");
    expect(content).toContain("redis:7-alpine");
  });

  it("GitHub Actions CI workflow exists and specifies Node 22", () => {
    const ciPath = path.resolve(__dirname, "../.github/workflows/ci.yml");
    expect(fs.existsSync(ciPath)).toBe(true);

    const content = fs.readFileSync(ciPath, "utf-8");
    expect(content).toContain("node-version: 22.x");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm run typecheck");
    expect(content).toContain("npm run test");
    expect(content).toContain("npm run build");
  });
});
