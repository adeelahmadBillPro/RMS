/**
 * Payment recording (in-app) types. Phase 1 records payments manually —
 * cashier picks the method and enters a reference. Real JazzCash /
 * Easypaisa webhooks land in Phase 3 against the `verification` field.
 */
export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "JAZZCASH"
  | "EASYPAISA"
  | "BANK_TRANSFER"
  | "SPLIT";

export type PaymentVerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED";

export interface PaymentRecord {
  method: PaymentMethod;
  amountPaisa: number;
  reference?: string;
  screenshotUrl?: string;
  verification: PaymentVerificationStatus;
}
