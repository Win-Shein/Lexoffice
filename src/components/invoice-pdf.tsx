import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { TaxType } from "@/generated/prisma/enums";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { KLEINBETRAG_LIMIT } from "@/lib/vat";

export type InvoicePdfSeller = {
  companyName: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  vatId?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
};

export type InvoicePdfCustomer = {
  name: string;
  address: string;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  vatId?: string | null;
};

export type InvoicePdfItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalNet: number;
  taxType: TaxType;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  performanceDate: Date | string;
  status: string;
  notes?: string | null;
  subtotalNet: number;
  vatAmount: number;
  totalGross: number;
  isSmallBiz: boolean;
  isReverseCharge: boolean;
  seller: InvoicePdfSeller;
  customer: InvoicePdfCustomer;
  items: InvoicePdfItem[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 48,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  company: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#64748b" },
  small: { fontSize: 8.5, color: "#64748b" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { fontSize: 8.5, color: "#64748b" },
  metaValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 18, marginBottom: 8 },
  label: { fontSize: 8.5, color: "#64748b", marginBottom: 4, fontFamily: "Helvetica-Bold" },
  table: { marginTop: 14, borderTopWidth: 1, borderColor: "#e2e8f0" },
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
    paddingVertical: 6,
  },
  colPos: { width: "7%", paddingHorizontal: 4 },
  colDesc: { width: "45%", paddingHorizontal: 4 },
  colQty: { width: "12%", textAlign: "right", paddingHorizontal: 4 },
  colUnit: { width: "10%", textAlign: "center", paddingHorizontal: 4 },
  colPrice: { width: "13%", textAlign: "right", paddingHorizontal: 4 },
  colTotal: { width: "13%", textAlign: "right", paddingHorizontal: 4 },
  headText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#475569" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: "55%" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
  },
  totalsGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: "#0f172a",
  },
  notice: {
    marginTop: 16,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderLeftWidth: 3,
    borderColor: "#2563eb",
    fontSize: 8.5,
    color: "#334155",
  },
  noticeBox: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#78350f",
  },
  bank: { marginTop: 22, fontSize: 8.5, color: "#475569" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 6,
    fontSize: 7.5,
    color: "#94a3b8",
    textAlign: "center",
  },
  summaryTable: { marginTop: 16, borderTopWidth: 1, borderColor: "#e2e8f0" },
  summaryHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
  },
  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 5,
  },
  sumNo: { width: "18%", paddingHorizontal: 4 },
  sumDate: { width: "14%", paddingHorizontal: 4 },
  sumCustomer: { width: "34%", paddingHorizontal: 4 },
  sumStatus: { width: "14%", paddingHorizontal: 4 },
  sumTotal: { width: "20%", textAlign: "right", paddingHorizontal: 4 },
});

function addressLine(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function InvoicePage({ data }: { data: InvoicePdfData }) {
  const { seller, customer } = data;

  const sellerAddress = addressLine([
    seller.address,
    [seller.postalCode, seller.city].filter(Boolean).join(" "),
    seller.country,
  ]);

  return (
    <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ width: "60%" }}>
            <Text style={styles.company}>{seller.companyName}</Text>
            {sellerAddress ? <Text style={styles.small}>{sellerAddress}</Text> : null}
            {seller.phone ? <Text style={styles.small}>Tel: {seller.phone}</Text> : null}
            {seller.email ? <Text style={styles.small}>{seller.email}</Text> : null}
          </View>
          <View style={{ width: "38%", alignItems: "flex-end" }}>
            <Text style={styles.title}>RECHNUNG</Text>
            <Text style={styles.small}>Nr. {data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={{ width: "55%" }}>
            <Text style={styles.label}>RECHNUNGSEMPFÄNGER</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{customer.name}</Text>
            <Text>{customer.address}</Text>
            <Text>
              {addressLine([
                [customer.postalCode, customer.city].filter(Boolean).join(" "),
                customer.country,
              ])}
            </Text>
            {customer.vatId ? <Text style={styles.small}>USt-IdNr.: {customer.vatId}</Text> : null}
          </View>
          <View style={{ width: "40%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={styles.metaLabel}>Rechnungsnummer</Text>
              <Text style={styles.metaValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={styles.metaLabel}>Ausstellungsdatum</Text>
              <Text style={styles.metaValue}>{formatDate(data.issueDate)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={styles.metaLabel}>Leistungsdatum</Text>
              <Text style={styles.metaValue}>{formatDate(data.performanceDate)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.metaLabel}>Fällig am</Text>
              <Text style={styles.metaValue}>{formatDate(data.dueDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headText, styles.colPos]}>Pos.</Text>
            <Text style={[styles.headText, styles.colDesc]}>Beschreibung</Text>
            <Text style={[styles.headText, styles.colQty]}>Menge</Text>
            <Text style={[styles.headText, styles.colUnit]}>Einheit</Text>
            <Text style={[styles.headText, styles.colPrice]}>Einzelpreis</Text>
            <Text style={[styles.headText, styles.colTotal]}>Gesamt</Text>
          </View>

          {data.items.map((item, i) => (
            <View style={styles.tableRow} key={`${item.description}-${i}`}>
              <Text style={styles.colPos}>{i + 1}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{formatNumber(item.quantity)}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.totalNet)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Zwischensumme netto</Text>
            <Text>{formatCurrency(data.subtotalNet)}</Text>
          </View>

          <View style={styles.totalsGrand}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5 }}>
              Gesamtbetrag
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5 }}>
              {formatCurrency(data.totalGross)}
            </Text>
          </View>
        </View>

        {data.isSmallBiz ? (
          <View style={styles.noticeBox}>
            <Text>*Umsatzsteuerfreie Leistungen gemäß §19 UStG.</Text>
          </View>
        ) : null}

        {data.isReverseCharge ? (
          <View style={styles.notice}>
            <Text>
              Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge, §13b UStG).
            </Text>
          </View>
        ) : null}

        {data.totalGross <= KLEINBETRAG_LIMIT && !data.isSmallBiz ? (
          <View style={styles.notice}>
            <Text>
              Kleinbetragsrechnung gemäß § 33 UStDV (Gesamtbetrag bis {formatCurrency(
                KLEINBETRAG_LIMIT,
              )}).
            </Text>
          </View>
        ) : null}

        {data.notes ? (
          <View style={styles.section}>
            <Text style={styles.label}>HINWEISE</Text>
            <Text style={styles.muted}>{data.notes}</Text>
          </View>
        ) : null}

        <View style={styles.bank}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Zahlungsinformationen</Text>
          <Text>
            Bitte überweisen Sie den Gesamtbetrag bis zum {formatDate(data.dueDate)}.
          </Text>
          {seller.iban ? (
            <Text>
              {seller.bankName ? `${seller.bankName} · ` : ""}
              IBAN: {seller.iban}
              {seller.bic ? ` · BIC: ${seller.bic}` : ""}
            </Text>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {[
              seller.companyName,
              seller.taxNumber ? `Steuernummer: ${seller.taxNumber}` : null,
              seller.vatId ? `USt-IdNr.: ${seller.vatId}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
    </Page>
  );
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document
      title={`Rechnung ${data.invoiceNumber}`}
      author={data.seller.companyName}
      subject={`Rechnung ${data.invoiceNumber}`}
    >
      <InvoicePage data={data} />
    </Document>
  );
}

export function BatchInvoicePdfDocument({
  invoices,
  title = "Rechnungsübersicht",
}: {
  invoices: InvoicePdfData[];
  title?: string;
}) {
  const seller = invoices[0]?.seller;
  const total = invoices.reduce((sum, invoice) => sum + invoice.totalGross, 0);

  return (
    <Document title={title} author={seller?.companyName ?? ""} subject={title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ width: "60%" }}>
            <Text style={styles.company}>{seller?.companyName ?? ""}</Text>
          </View>
          <View style={{ width: "38%", alignItems: "flex-end" }}>
            <Text style={styles.title}>ÜBERSICHT</Text>
          </View>
        </View>

        <Text style={styles.label}>{title.toUpperCase()}</Text>

        <View style={styles.summaryTable}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.headText, styles.sumNo]}>Rechnungsnr.</Text>
            <Text style={[styles.headText, styles.sumDate]}>Datum</Text>
            <Text style={[styles.headText, styles.sumCustomer]}>Kunde</Text>
            <Text style={[styles.headText, styles.sumStatus]}>Status</Text>
            <Text style={[styles.headText, styles.sumTotal]}>Gesamt</Text>
          </View>
          {invoices.map((invoice) => (
            <View style={styles.summaryRow} key={invoice.invoiceNumber}>
              <Text style={styles.sumNo}>{invoice.invoiceNumber}</Text>
              <Text style={styles.sumDate}>{formatDate(invoice.issueDate)}</Text>
              <Text style={styles.sumCustomer}>{invoice.customer.name}</Text>
              <Text style={styles.sumStatus}>{invoice.status}</Text>
              <Text style={styles.sumTotal}>{formatCurrency(invoice.totalGross)}</Text>
            </View>
          ))}
          <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingTop: 10 }]}>
            <Text style={[styles.headText, { width: "80%", textAlign: "right" }]}>
              Gesamt
            </Text>
            <Text style={[styles.sumTotal, { fontFamily: "Helvetica-Bold" }]}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      </Page>

      {invoices.map((invoice) => (
        <InvoicePage key={invoice.invoiceNumber} data={invoice} />
      ))}
    </Document>
  );
}
