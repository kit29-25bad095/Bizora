/**
 * MODULAR STORE REPOSITORY INTERFACE & IN-MEMORY ADAPTER
 * Provides a clean separation of concerns between business logic and physical persistence.
 * Ready for drop-in Drizzle ORM + PostgreSQL client when live credentials are provided.
 */

import {
  Business,
  Customer,
  Transaction,
  Quotation,
  RecoveryDraft,
  CommunicationHandoff,
  DraftStatus,
} from "@/types/domain";
import {
  MOCK_BUSINESS,
  MOCK_CUSTOMERS,
  MOCK_TRANSACTIONS,
  MOCK_QUOTATIONS,
  MOCK_RECOVERY_DRAFTS,
} from "./mock-store";

export interface StoreRepository {
  getBusiness(businessId: string): Promise<Business | null>;
  getCustomers(businessId: string): Promise<Customer[]>;
  getCustomerById(businessId: string, customerId: string): Promise<Customer | null>;
  getTransactions(businessId: string): Promise<Transaction[]>;
  getCustomerTransactions(businessId: string, customerId: string): Promise<Transaction[]>;
  getQuotations(businessId: string): Promise<Quotation[]>;
  getRecoveryDrafts(businessId: string): Promise<RecoveryDraft[]>;
  getRecoveryDraftById(businessId: string, draftId: string): Promise<RecoveryDraft | null>;
  updateDraftStatus(
    businessId: string,
    draftId: string,
    status: DraftStatus,
    userId: string,
    options?: { editedBody?: string; editedSubject?: string; rejectionReason?: string }
  ): Promise<RecoveryDraft>;
  createRecoveryDraft(draft: RecoveryDraft): Promise<RecoveryDraft>;
  recordCommunicationHandoff(handoff: CommunicationHandoff): Promise<CommunicationHandoff>;
  getCommunicationHandoffs(businessId: string): Promise<CommunicationHandoff[]>;
}

export class InMemoryStoreRepository implements StoreRepository {
  private business: Business = { ...MOCK_BUSINESS };
  private customers: Customer[] = [...MOCK_CUSTOMERS];
  private transactions: Transaction[] = [...MOCK_TRANSACTIONS];
  private quotations: Quotation[] = [...MOCK_QUOTATIONS];
  private drafts: RecoveryDraft[] = [...MOCK_RECOVERY_DRAFTS];
  private handoffs: CommunicationHandoff[] = [];

  private matchesTenant(recordBusinessId: string, queryBusinessId: string): boolean {
    return (
      recordBusinessId === queryBusinessId ||
      ((recordBusinessId === "biz-apex-001" || recordBusinessId === "11111111-1111-4111-8111-111111111111") &&
       (queryBusinessId === "biz-apex-001" || queryBusinessId === "11111111-1111-4111-8111-111111111111"))
    );
  }

  async getBusiness(businessId: string): Promise<Business | null> {
    if (this.matchesTenant(this.business.id, businessId)) return { ...this.business };
    return null;
  }

  async getCustomers(businessId: string): Promise<Customer[]> {
    return this.customers.filter((c) => this.matchesTenant(c.businessId, businessId));
  }

  async getCustomerById(businessId: string, customerId: string): Promise<Customer | null> {
    const cust = this.customers.find((c) => this.matchesTenant(c.businessId, businessId) && c.id === customerId);
    return cust ? { ...cust } : null;
  }

  async getTransactions(businessId: string): Promise<Transaction[]> {
    return this.transactions.filter((t) => this.matchesTenant(t.businessId, businessId));
  }

  async getCustomerTransactions(businessId: string, customerId: string): Promise<Transaction[]> {
    return this.transactions.filter(
      (t) => this.matchesTenant(t.businessId, businessId) && t.customerId === customerId
    );
  }

  async getQuotations(businessId: string): Promise<Quotation[]> {
    return this.quotations.filter((q) => this.matchesTenant(q.businessId, businessId));
  }

  async getRecoveryDrafts(businessId: string): Promise<RecoveryDraft[]> {
    return this.drafts.filter((d) => this.matchesTenant(d.businessId, businessId));
  }

  async getRecoveryDraftById(businessId: string, draftId: string): Promise<RecoveryDraft | null> {
    const draft = this.drafts.find((d) => this.matchesTenant(d.businessId, businessId) && d.id === draftId);
    return draft ? { ...draft } : null;
  }

  async updateDraftStatus(
    businessId: string,
    draftId: string,
    status: DraftStatus,
    userId: string,
    options?: { editedBody?: string; editedSubject?: string; rejectionReason?: string }
  ): Promise<RecoveryDraft> {
    const index = this.drafts.findIndex((d) => d.businessId === businessId && d.id === draftId);
    if (index === -1) {
      throw new Error(`Draft with ID ${draftId} not found for business ${businessId}`);
    }

    const current = this.drafts[index]!;
    const now = new Date().toISOString();

    const updated: RecoveryDraft = {
      ...current,
      status,
      updatedAt: now,
      draftBody: options?.editedBody ?? current.draftBody,
      draftSubject: options?.editedSubject ?? current.draftSubject,
      approvedByUserId: status === "approved" ? userId : current.approvedByUserId,
      approvedAt: status === "approved" ? now : current.approvedAt,
      rejectedByUserId: status === "rejected" ? userId : current.rejectedByUserId,
      rejectedAt: status === "rejected" ? now : current.rejectedAt,
      rejectionReason: options?.rejectionReason ?? current.rejectionReason,
    };

    this.drafts[index] = updated;
    return { ...updated };
  }

  async createRecoveryDraft(draft: RecoveryDraft): Promise<RecoveryDraft> {
    this.drafts.push({ ...draft });
    return { ...draft };
  }

  async recordCommunicationHandoff(handoff: CommunicationHandoff): Promise<CommunicationHandoff> {
    this.handoffs.push({ ...handoff });
    return { ...handoff };
  }

  async getCommunicationHandoffs(businessId: string): Promise<CommunicationHandoff[]> {
    return this.handoffs.filter((h) => h.businessId === businessId);
  }
}

// Global singleton instance for demonstrative MVP runtime
export const storeRepo: StoreRepository = new InMemoryStoreRepository();
