import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCurrency, formatDate } from "@/lib/format";

export type ExpensePdfRow = {
  date: Date | string;
  description: string;
  vendor: string | null;
  category: string;
  amountNet: number;
  vatAmount: number;
  amountGross: number;
};

export type ExpenseListPdfData = {
  companyName: string;
  from?: string;
  to?: string;
  expenses: ExpensePdfRow[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  company: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  period: { fontSize: 8.5, color: "#64748b", marginBottom: 12 },
  table: { marginTop: 6, borderTopWidth: 1, borderColor: "#e2e8f0" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 5,
  },
  headText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#475569" },
  colDate: { width: "15%", paddingHorizontal: 4 },
  colDesc: { width: "40%", paddingHorizontal: 4 },
  colCategory: { width: "15%", paddingHorizontal: 4 },
  colNum: { width: "10%", textAlign: "right", paddingHorizontal: 4 },
  totalRow: {
    flexDirection: "row",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#0f172a",
  },
  totalLabel: {
    width: "70%",
    textAlign: "right",
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
  },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 6,
    fontSize: 7.5,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export function ExpenseListPdfDocument({ data }: { data: ExpenseListPdfData }) {
  const totalNet = data.expenses.reduce((sum, expense) => sum + expense.amountNet, 0);
  const totalVat = data.expenses.reduce((sum, expense) => sum + expense.vatAmount, 0);
  const totalGross = data.expenses.reduce(
    (sum, expense) => sum + expense.amountGross,
    0,
  );

  const period =
    data.from || data.to
      ? `${data.from ? formatDate(data.from) : "…"} – ${data.to ? formatDate(data.to) : "…"}`
      : "Alle Ausgaben";

  return (
    <Document title="Ausgaben" author={data.companyName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.company}>{data.companyName}</Text>
          <Text style={styles.title}>AUSGABEN</Text>
        </View>
        <Text style={styles.period}>Zeitraum: {period}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headText, styles.colDate]}>Datum</Text>
            <Text style={[styles.headText, styles.colDesc]}>Beschreibung</Text>
            <Text style={[styles.headText, styles.colCategory]}>Kategorie</Text>
            <Text style={[styles.headText, styles.colNum]}>Netto</Text>
            <Text style={[styles.headText, styles.colNum]}>USt</Text>
            <Text style={[styles.headText, styles.colNum]}>Brutto</Text>
          </View>

          {data.expenses.map((expense, index) => (
            <View style={styles.tableRow} key={`${expense.date}-${index}`}>
              <Text style={styles.colDate}>{formatDate(expense.date)}</Text>
              <Text style={styles.colDesc}>
                {expense.description}
                {expense.vendor ? ` · ${expense.vendor}` : ""}
              </Text>
              <Text style={styles.colCategory}>{expense.category}</Text>
              <Text style={styles.colNum}>{formatCurrency(expense.amountNet)}</Text>
              <Text style={styles.colNum}>{formatCurrency(expense.vatAmount)}</Text>
              <Text style={styles.colNum}>{formatCurrency(expense.amountGross)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gesamt</Text>
            <Text style={[styles.colNum, styles.bold]}>{formatCurrency(totalNet)}</Text>
            <Text style={[styles.colNum, styles.bold]}>{formatCurrency(totalVat)}</Text>
            <Text style={[styles.colNum, styles.bold]}>{formatCurrency(totalGross)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{data.companyName} · Ausgabenliste</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateExpenseListPdf(data: ExpenseListPdfData): Promise<Buffer> {
  return renderToBuffer(<ExpenseListPdfDocument data={data} />);
}
