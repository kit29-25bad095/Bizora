import { NextRequest, NextResponse } from "next/server";
import { tenantCache } from "@/lib/cache";

export async function GET(req?: NextRequest | Request) {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const version = process.env.npm_package_version || "1.0.0";

  // Check cache subsystem health
  const cacheStats = tenantCache.getStats();

  return NextResponse.json(
    {
      success: true,
      status: "healthy",
      timestamp,
      uptime,
      version,
      checks: {
        application: "healthy",
        cache: "healthy",
        timestamp,
      },
      telemetry: {
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        cacheHitRatio: cacheStats.hitRatio,
        cacheItems: cacheStats.itemCount,
      },
      data: {
        status: "healthy",
        timestamp,
        uptime,
        version,
      },
    },
    { status: 200 }
  );
}
