import { withTenantContext } from "../db/tenant-context";
import { requirePermission } from "../auth/rbac";
import { SessionUser } from "../auth/session";
import {
  generateCustomerRecoveryDraft,
  generateQuotationFollowupDraft,
  createHandoffLink,
} from "../engine/recovery";
import { Customer, Quotation, RecoveryDraft, CommunicationHandoff } from "@/types/domain";
import { CustomerDormancyAssessment } from "@/types/engine";
import { ValidationError } from "../errors";

export class RecoveryService {
  /**
   * Generates a new recovery draft for a dormant customer opportunity.
   */
  static async createCustomerDraft(
    businessId: string,
    customer: Customer,
    assessment: CustomerDormancyAssessment,
    businessName: string
  ): Promise<RecoveryDraft> {
    return withTenantContext(businessId, async () => {
      return generateCustomerRecoveryDraft(customer, assessment, businessName);
    });
  }

  /**
   * Generates a recovery follow-up draft for an expiring quotation.
   */
  static async createQuoteDraft(
    businessId: string,
    quote: Quotation,
    customerName: string,
    recipient: string,
    businessName: string
  ): Promise<RecoveryDraft> {
    return withTenantContext(businessId, async () => {
      return generateQuotationFollowupDraft(quote, customerName, recipient, businessName);
    });
  }

  /**
   * Approves a recovery draft.
   * Strictly enforces Owner authorization check ('recovery:approve').
   */
  static async approveDraft(
    businessId: string,
    draft: RecoveryDraft,
    approver: SessionUser
  ): Promise<RecoveryDraft> {
    return withTenantContext(businessId, async () => {
      requirePermission(approver, "recovery:approve");

      if (draft.status !== "pending_approval") {
        throw new ValidationError(
          `Cannot approve draft with current status '${draft.status}'`
        );
      }

      const now = new Date().toISOString();
      return {
        ...draft,
        status: "approved",
        updatedAt: now,
      };
    });
  }

  /**
   * Rejects a recovery draft.
   * Strictly enforces Owner authorization check ('recovery:approve').
   */
  static async rejectDraft(
    businessId: string,
    draft: RecoveryDraft,
    rejecter: SessionUser,
    reason: string
  ): Promise<RecoveryDraft> {
    return withTenantContext(businessId, async () => {
      requirePermission(rejecter, "recovery:approve");

      if (draft.status !== "pending_approval") {
        throw new ValidationError(
          `Cannot reject draft with current status '${draft.status}'`
        );
      }

      const now = new Date().toISOString();
      return {
        ...draft,
        status: "rejected",
        updatedAt: now,
      };
    });
  }

  /**
   * Generates the client-side handoff URL (wa.me or mailto).
   * Strictly requires that the draft is in 'approved' status and user has 'recovery:execute'.
   */
  static async generateHandoff(
    businessId: string,
    draft: RecoveryDraft,
    user: SessionUser
  ): Promise<{ handoff: CommunicationHandoff; url: string }> {
    return withTenantContext(businessId, async () => {
      requirePermission(user, "recovery:execute");

      if (draft.status !== "approved") {
        throw new ValidationError(
          `Handoff rejected: draft must be approved by an Owner before handoff URL generation. Current status: '${draft.status}'`
        );
      }

      return createHandoffLink(draft, user.id);
    });
  }
}
