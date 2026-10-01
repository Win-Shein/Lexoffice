import type { InvoiceStatus, TaxType } from "@/generated/prisma/enums";

export type ActionResult =
  | { ok: true; id?: string; warnings?: string[] }
  | { ok: false; error: string };

export type InvoiceLinePayload = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxType: TaxType;
};

export type CreateInvoicePayload = {
  customerId: string;
  issueDate: string;
  dueDate: string;
  performanceDate: string;
  notes?: string;
  status: InvoiceStatus;
  isSmallBiz: boolean;
  isReverseCharge: boolean;
  taxType: TaxType;
  items: InvoiceLinePayload[];
};
