import crypto from "node:crypto";
import { withTenantContext } from "../db/tenant-context";

export interface AuditEventInput {
  businessId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  previousHash?: string;
  sequenceNumber?: bigint;
}

export interface StoredAuditEvent {
  id: string;
  businessId: string;
  sequenceNumber: bigint;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  previousHash: string;
  eventHash: string;
  createdAt: string;
}

/**
 * Calculates SHA-256 hash for tamper-evident audit chaining.
 */
export function calculateAuditEventHash(params: {
  businessId: string;
  sequenceNumber: bigint;
  action: string;
  entityType: string;
  entityId: string;
  metadataStr: string;
  previousHash: string;
  createdAt: string;
}): string {
  const payload = [
    params.previousHash,
    params.businessId,
    params.sequenceNumber.toString(),
    params.action,
    params.entityType,
    params.entityId,
    params.metadataStr,
    params.createdAt,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

export class AuditService {
  /**
   * Constructs an immutable, cryptographically chained audit event.
   */
  static createEvent(input: AuditEventInput): StoredAuditEvent {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const metadata = input.metadata || {};
    const metadataStr = JSON.stringify(metadata);
    const sequenceNumber = input.sequenceNumber || BigInt(1);
    const previousHash =
      input.previousHash ||
      "0000000000000000000000000000000000000000000000000000000000000000";

    const eventHash = calculateAuditEventHash({
      businessId: input.businessId,
      sequenceNumber,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataStr,
      previousHash,
      createdAt,
    });

    return {
      id,
      businessId: input.businessId,
      sequenceNumber,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      previousHash,
      eventHash,
      createdAt,
    };
  }

  /**
   * Verifies the cryptographic chain integrity of a sequence of audit events.
   */
  static verifyChainIntegrity(events: StoredAuditEvent[]): {
    valid: boolean;
    brokenIndex?: number;
    reason?: string;
  } {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event) continue;

      // Check previous hash link
      if (i > 0) {
        const prev = events[i - 1];
        if (prev && event.previousHash !== prev.eventHash) {
          return {
            valid: false,
            brokenIndex: i,
            reason: `Broken chain link at index ${i}: previousHash does not match event ${i - 1} hash`,
          };
        }
      }

      // Recompute and verify eventHash
      const recomputedHash = calculateAuditEventHash({
        businessId: event.businessId,
        sequenceNumber: event.sequenceNumber,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadataStr: JSON.stringify(event.metadata),
        previousHash: event.previousHash,
        createdAt: event.createdAt,
      });

      if (recomputedHash !== event.eventHash) {
        return {
          valid: false,
          brokenIndex: i,
          reason: `Tampered event payload at index ${i}: hash mismatch`,
        };
      }
    }

    return { valid: true };
  }
}
