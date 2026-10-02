import { formatDate } from "@/lib/format";

export type DatevRow = {
  account: string;
  contraAccount: string;
  amount: number;
  debitCredit: "S" | "H";
  date: Date;
  documentNumber: string;
  text: string;
};

export type DatevExport = {
  rows: DatevRow[];
  csv: string;
};

const DATEV_DELIMITER = ";";

function escape(value: string) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  if (clean.includes(DATEV_DELIMITER) || clean.includes('"')) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

/**
 * Builds a DATEV-compatible booking batch (Buchungsstapel) as a semicolon
 * separated CSV. Sellers post debtor (10000) against revenue (8400 for 19%
 * and 8300 for 7%); expenses post the expense account against creditor (10000).
 */
export function buildDatevCsv(
  rows: DatevRow[],
  meta: { consultantNumber?: string; clientNumber?: string; period: string },
): DatevExport {
  const header = [
    "EXTF",
    "700",
    "21",
    "Buchungsstapel",
    "1",
    formatDate(new Date()),
    meta.period,
    "",
    "RE",
    "",
    meta.consultantNumber ?? "1000000",
    meta.clientNumber ?? "1",
    "MMXeron",
    "2026010100000000",
    "0",
    "EUR",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "1",
  ].join(DATEV_DELIMITER);

  const columns = [
    "Umsatz",
    "Soll/Haben-Kennzeichen",
    "Konto",
    "Gegenkonto",
    "Belegdatum",
    "Belegfeld 1",
    "Buchungstext",
  ].join(DATEV_DELIMITER);

  const body = rows.map((row) =>
    [
      row.amount.toFixed(2).replace(".", ","),
      row.debitCredit,
      row.account,
      row.contraAccount,
      formatDate(row.date),
      row.documentNumber,
      row.text,
    ]
      .map((value) => escape(String(value)))
      .join(DATEV_DELIMITER),
  );

  return { rows, csv: [header, columns, ...body].join("\r\n") };
}
