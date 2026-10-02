import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

import { BatchInvoicePdfDocument } from "@/components/invoice-pdf";
import { getLocalUserId } from "@/auth";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { toInvoicePdfData } from "@/lib/pdf";

export const runtime = "nodejs";

const isDate = (value: string | null): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  const userId = await getLocalUserId();

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const statusParam = searchParams.get("status");
  const from = isDate(fromParam) ? fromParam : undefined;
  const to = isDate(toParam) ? toParam : undefined;
  const status =
    statusParam && (Object.values(InvoiceStatus) as string[]).includes(statusParam)
      ? (statusParam as InvoiceStatus)
      : undefined;

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            issueDate: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    include: { customer: true, items: true, user: true },
    orderBy: { issueDate: "asc" },
    take: 200,
  });

  if (invoices.length === 0) {
    return new Response("Keine Rechnungen im gewählten Zeitraum gefunden.", {
      status: 404,
    });
  }

  const data = invoices.map(toInvoicePdfData);
  const buffer = await renderToBuffer(
    createElement(BatchInvoicePdfDocument, { invoices: data }),
  );

  const rangeLabel = `${from ?? "Start"}_${to ?? "Ende"}`;
  const filename = `Rechnungen_${rangeLabel}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
