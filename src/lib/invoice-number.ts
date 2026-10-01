export function formatInvoiceNumber(year: number, sequence: number) {
  return `RE-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseInvoiceSequence(invoiceNumber: string) {
  const match = invoiceNumber.match(/(\d+)\s*$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}
