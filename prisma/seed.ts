import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { CategoryType } from "../src/generated/prisma/enums";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function eur(value: number) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const email = "demo@lexoffice.de";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: null, companyName: "MMXeron" },
    create: {
      email,
      name: null,
      passwordHash,
      companyName: "MMXeron",
      address: "Musterstraße 12",
      city: "Berlin",
      postalCode: "10115",
      country: "Deutschland",
      phone: "+49 30 1234567",
      taxNumber: "12/345/67890",
      vatId: "DE123456789",
      iban: "DE02120300000000202051",
      bic: "BYLADEM1001",
      bankName: "Deutsche Kreditbank",
      isSmallBiz: false,
      invoiceSeq: 0,
    },
  });

  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.invoice.deleteMany({ where: { userId: user.id } });
  await prisma.customer.deleteMany({});
  await prisma.category.deleteMany({ where: { userId: user.id } });

  await prisma.category.createMany({
    data: [
      ...[
        "Dienstleistung",
        "Produkt",
        "Material",
        "Lizenz",
        "Sonstiges",
      ].map((name) => ({ userId: user.id, name, type: CategoryType.ITEM })),
      ...[
        "Software",
        "Miete",
        "Bewirtung",
        "Ausstattung",
        "Infrastruktur",
        "Reise",
        "Beratung",
        "Marketing",
        "Sonstiges",
      ].map((name) => ({ userId: user.id, name, type: CategoryType.EXPENSE })),
    ],
  });

  const acme = await prisma.customer.create({
    data: {
      name: "Acme Solutions GmbH",
      email: "rechnung@acme-solutions.de",
      address: "Hauptstraße 45",
      city: "München",
      postalCode: "80331",
      country: "Deutschland",
      vatId: "DE987654321",
    },
  });

  const studio = await prisma.customer.create({
    data: {
      name: "Studio Nordlicht",
      email: "buchhaltung@nordlicht.de",
      address: "Hafenweg 3",
      city: "Hamburg",
      postalCode: "20457",
      country: "Deutschland",
      vatId: "DE456789123",
    },
  });

  const euClient = await prisma.customer.create({
    data: {
      name: "European Ventures B.V.",
      email: "finance@euventures.nl",
      address: "Keizersgracht 100",
      city: "Amsterdam",
      postalCode: "1015",
      country: "Niederlande",
      vatId: "NL123456789B01",
    },
  });

  const invoices = [
    {
      number: "RE-2026-0001",
      customer: acme,
      issueDate: new Date("2026-01-15"),
      performanceDate: new Date("2026-01-10"),
      dueDate: new Date("2026-01-29"),
      status: "PAID" as const,
      paidAt: new Date("2026-01-25"),
      taxType: "STANDARD_19" as const,
      vatRate: 19,
      items: [
        { description: "Konzeption Website", quantity: 1, unitPrice: 2400 },
        { description: "Design-System", quantity: 1, unitPrice: 1600 },
      ],
    },
    {
      number: "RE-2026-0002",
      customer: studio,
      issueDate: new Date("2026-02-02"),
      performanceDate: new Date("2026-02-01"),
      dueDate: new Date("2026-02-16"),
      status: "PAID" as const,
      paidAt: new Date("2026-02-14"),
      taxType: "STANDARD_19" as const,
      vatRate: 19,
      items: [
        { description: "Landingpage Entwicklung", quantity: 1, unitPrice: 3200 },
        { description: "Wartungspauschale", quantity: 3, unitPrice: 150 },
      ],
    },
    {
      number: "RE-2026-0003",
      customer: euClient,
      issueDate: new Date("2026-03-05"),
      performanceDate: new Date("2026-03-05"),
      dueDate: new Date("2026-03-19"),
      status: "SENT" as const,
      taxType: "EXEMPT_0" as const,
      vatRate: 0,
      isReverseCharge: true,
      items: [{ description: "Beratung (Reverse Charge)", quantity: 12, unitPrice: 180 }],
    },
    {
      number: "RE-2026-0004",
      customer: acme,
      issueDate: new Date("2026-03-20"),
      performanceDate: new Date("2026-03-18"),
      dueDate: new Date("2026-04-03"),
      status: "OVERDUE" as const,
      taxType: "STANDARD_19" as const,
      vatRate: 19,
      items: [
        { description: "SEO Optimierung", quantity: 1, unitPrice: 950 },
        { description: "Content Erstellung", quantity: 4, unitPrice: 220 },
      ],
    },
    {
      number: "RE-2026-0005",
      customer: studio,
      issueDate: new Date("2026-04-08"),
      performanceDate: new Date("2026-04-08"),
      dueDate: new Date("2026-04-22"),
      status: "DRAFT" as const,
      taxType: "STANDARD_19" as const,
      vatRate: 19,
      items: [{ description: "Branding Workshop", quantity: 1, unitPrice: 1800 }],
    },
  ];

  let seq = 0;
  for (const inv of invoices) {
    const items = inv.items.map((item) => ({
      ...item,
      totalNet: eur(item.quantity * item.unitPrice),
      taxType: inv.taxType,
    }));
    const subtotalNet = eur(items.reduce((sum, item) => sum + item.totalNet, 0));
    const vatAmount = eur(subtotalNet * (inv.vatRate / 100));
    const totalGross = eur(subtotalNet + vatAmount);
    seq += 1;

    await prisma.invoice.create({
      data: {
        invoiceNumber: inv.number,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        performanceDate: inv.performanceDate,
        userId: user.id,
        customerId: inv.customer.id,
        subtotalNet,
        vatRate: inv.vatRate,
        vatAmount,
        totalGross,
        taxType: inv.taxType,
        isReverseCharge: inv.isReverseCharge ?? false,
        status: inv.status,
        paidAt: inv.paidAt ?? null,
        sentAt: inv.status === "DRAFT" ? null : inv.issueDate,
        items: { create: items },
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { invoiceSeq: seq },
  });

  const expenses = [
    { description: "Adobe Creative Cloud", vendor: "Adobe", category: "Software", amountNet: 59.99, vatRate: 19, date: new Date("2026-01-05") },
    { description: "Büromiete Januar", vendor: "Hausverwaltung GmbH", category: "Miete", amountNet: 1200, vatRate: 19, date: new Date("2026-01-31") },
    { description: "Figma Abonnement", vendor: "Figma", category: "Software", amountNet: 15, vatRate: 19, date: new Date("2026-02-06") },
    { description: "Geschäftsessen", vendor: "Restaurant Luna", category: "Bewirtung", amountNet: 85.5, vatRate: 19, date: new Date("2026-02-18") },
    { description: "Neuer Laptop", vendor: "MediaMarkt", category: "Ausstattung", amountNet: 1499, vatRate: 19, date: new Date("2026-03-11") },
    { description: "Webhosting", vendor: "All-Inkl", category: "Infrastruktur", amountNet: 9.9, vatRate: 19, date: new Date("2026-03-28") },
    { description: "Steuerberatung", vendor: "Kanzlei Schmidt", category: "Beratung", amountNet: 350, vatRate: 19, date: new Date("2026-04-02") },
  ];

  for (const exp of expenses) {
    const vatAmount = eur(exp.amountNet * (exp.vatRate / 100));
    await prisma.expense.create({
      data: {
        userId: user.id,
        description: exp.description,
        vendor: exp.vendor,
        category: exp.category,
        amountNet: exp.amountNet,
        vatRate: exp.vatRate,
        vatAmount,
        amountGross: eur(exp.amountNet + vatAmount),
        date: exp.date,
      },
    });
  }

  console.log(`Seeded user ${email} (password: demo1234) with ${invoices.length} invoices.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
