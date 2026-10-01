import { TaxType } from "@/generated/prisma/enums";

export const TAX_RATE_BY_TYPE: Record<TaxType, number> = {
  [TaxType.STANDARD_19]: 19,
  [TaxType.REDUCED_7]: 7,
  [TaxType.EXEMPT_0]: 0,
};

export const TAX_LABEL_BY_TYPE: Record<TaxType, string> = {
  [TaxType.STANDARD_19]: "19 % (Regelsteuersatz)",
  [TaxType.REDUCED_7]: "7 % (ermäßigt)",
  [TaxType.EXEMPT_0]: "0 % (steuerfrei)",
};

export const KLEINBETRAG_LIMIT = 250;

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxType: TaxType;
};

export type TaxBreakdownEntry = {
  taxType: TaxType;
  rate: number;
  net: number;
  tax: number;
};

export type InvoiceTotals = {
  subtotalNet: number;
  vatAmount: number;
  totalGross: number;
  breakdown: TaxBreakdownEntry[];
};

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineTotal(line: Pick<InvoiceLineInput, "quantity" | "unitPrice">) {
  return round2((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0));
}

function resolveRate(
  taxType: TaxType,
  options: { isSmallBiz?: boolean; isReverseCharge?: boolean },
) {
  if (options.isSmallBiz || options.isReverseCharge) return 0;
  return TAX_RATE_BY_TYPE[taxType] ?? 19;
}

export function calcInvoiceTotals(
  lines: InvoiceLineInput[],
  options: { isSmallBiz?: boolean; isReverseCharge?: boolean } = {},
): InvoiceTotals {
  const byType = new Map<TaxType, TaxBreakdownEntry>();

  for (const line of lines) {
    const net = lineTotal(line);
    const rate = resolveRate(line.taxType, options);
    const existing = byType.get(line.taxType);

    if (existing) {
      existing.net = round2(existing.net + net);
      existing.tax = round2(existing.tax + (net * rate) / 100);
    } else {
      byType.set(line.taxType, {
        taxType: line.taxType,
        rate,
        net,
        tax: round2((net * rate) / 100),
      });
    }
  }

  const breakdown = Array.from(byType.values());
  const subtotalNet = round2(breakdown.reduce((sum, entry) => sum + entry.net, 0));
  const vatAmount = round2(breakdown.reduce((sum, entry) => sum + entry.tax, 0));

  return {
    subtotalNet,
    vatAmount,
    totalGross: round2(subtotalNet + vatAmount),
    breakdown,
  };
}

export function isKleinbetrag(totalGross: number) {
  return totalGross > 0 && totalGross <= KLEINBETRAG_LIMIT;
}

export function kleinunternehmerNotice() {
  return "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
}

export function reverseChargeNotice() {
  return "Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge).";
}
