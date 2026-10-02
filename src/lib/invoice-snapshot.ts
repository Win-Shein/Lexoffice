import { createHash } from "node:crypto";

import type { TaxType } from "@/generated/prisma/enums";

export type SellerSnapshot = {
  companyName: string;
  name: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  vatId: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  logoUrl: string | null;
};

export type CustomerSnapshot = {
  name: string;
  address: string;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  vatId: string | null;
};

type UserLike = {
  companyName: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string;
  taxNumber: string | null;
  vatId: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  logoUrl: string | null;
};

type CustomerLike = {
  name: string;
  address: string;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  vatId: string | null;
};

export function buildSellerSnapshot(user: UserLike): SellerSnapshot {
  return {
    companyName: user.companyName ?? user.name ?? "",
    name: user.name,
    address: user.address,
    city: user.city,
    postalCode: user.postalCode,
    country: user.country,
    phone: user.phone,
    email: user.email,
    taxNumber: user.taxNumber,
    vatId: user.vatId,
    iban: user.iban,
    bic: user.bic,
    bankName: user.bankName,
    logoUrl: user.logoUrl,
  };
}

export function buildCustomerSnapshot(customer: CustomerLike): CustomerSnapshot {
  return {
    name: customer.name,
    address: customer.address,
    city: customer.city,
    postalCode: customer.postalCode,
    country: customer.country,
    vatId: customer.vatId,
  };
}

export function parseSellerSnapshot(value: string | null): SellerSnapshot | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as SellerSnapshot;
  } catch {
    return null;
  }
}

export function parseCustomerSnapshot(value: string | null): CustomerSnapshot | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as CustomerSnapshot;
  } catch {
    return null;
  }
}

export type HashableInvoice = {
  invoiceNumber: string;
  documentType: string;
  issueDate: Date | string;
  dueDate: Date | string;
  performanceDate: Date | string;
  notes: string | null;
  subtotalNet: number;
  vatAmount: number;
  totalGross: number;
  isSmallBiz: boolean;
  isReverseCharge: boolean;
  seller: SellerSnapshot;
  customer: CustomerSnapshot;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalNet: number;
    taxType: TaxType | string;
  }>;
};

/**
 * Deterministic SHA-256 over the immutable content of a finalized document.
 * Any later change to the stored content can be detected by recomputing it.
 */
export function hashInvoiceContent(invoice: HashableInvoice): string {
  return createHash("sha256").update(stableStringify(invoice)).digest("hex");
}

/** Builds the immutable snapshot + content hash stored on a finalized document. */
export function buildFinalization(params: {
  core: Omit<HashableInvoice, "seller" | "customer" | "items">;
  items: HashableInvoice["items"];
  seller: SellerSnapshot;
  customer: CustomerSnapshot;
}): { sellerSnapshot: string; customerSnapshot: string; contentHash: string } {
  const { core, items, seller, customer } = params;
  return {
    sellerSnapshot: JSON.stringify(seller),
    customerSnapshot: JSON.stringify(customer),
    contentHash: hashInvoiceContent({ ...core, seller, customer, items }),
  };
}

/** JSON.stringify with recursively sorted object keys for stable hashing. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(record[key]);
        return acc;
      }, {});
  }
  return value;
}
