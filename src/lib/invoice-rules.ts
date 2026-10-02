import { InvoiceDocumentType, InvoiceStatus } from "@/generated/prisma/enums";

/**
 * States in which a document is considered finalized/issued and therefore
 * immutable in the sense of GoBD (§ 146 AO, GoBD Rn. 53-56).
 */
export const FINALIZED_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.SENT,
  InvoiceStatus.PAID,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.CANCELLED,
];

export function isFinalizedStatus(status: InvoiceStatus): boolean {
  return FINALIZED_STATUSES.includes(status);
}

/**
 * Allowed status transitions. A finalized (issued) invoice can never go back
 * to DRAFT. Corrections of issued documents must happen via a credit note
 * (Stornorechnung / Gutschrift), which is handled separately.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT],
  [InvoiceStatus.SENT]: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE],
  [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID, InvoiceStatus.SENT],
  [InvoiceStatus.PAID]: [],
  [InvoiceStatus.CANCELLED]: [],
};

export function canTransitionStatus(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isCreditNote(documentType: InvoiceDocumentType): boolean {
  return documentType === InvoiceDocumentType.CREDIT_NOTE;
}

export function formatCreditNoteNumber(year: number, sequence: number) {
  return `ST-${year}-${String(sequence).padStart(4, "0")}`;
}
