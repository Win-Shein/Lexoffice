import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildCustomerSnapshot,
  buildFinalization,
  buildSellerSnapshot,
} from "../src/lib/invoice-snapshot";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: { finalizedAt: null, status: { not: "DRAFT" } },
    include: { items: true, customer: true, user: true },
  });

  for (const invoice of invoices) {
    const seller = buildSellerSnapshot(invoice.user);
    const customer = buildCustomerSnapshot(invoice.customer);
    const fin = buildFinalization({
      core: {
        invoiceNumber: invoice.invoiceNumber,
        documentType: invoice.documentType,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        performanceDate: invoice.performanceDate,
        notes: invoice.notes,
        subtotalNet: invoice.subtotalNet,
        vatAmount: invoice.vatAmount,
        totalGross: invoice.totalGross,
        isSmallBiz: invoice.isSmallBiz,
        isReverseCharge: invoice.isReverseCharge,
      },
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalNet: item.totalNet,
        taxType: item.taxType,
      })),
      seller,
      customer,
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        finalizedAt: invoice.sentAt ?? invoice.createdAt,
        sellerSnapshot: fin.sellerSnapshot,
        customerSnapshot: fin.customerSnapshot,
        contentHash: fin.contentHash,
      },
    });
  }

  console.log(`Backfilled ${invoices.length} finalized invoice(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
