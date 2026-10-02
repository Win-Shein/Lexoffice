import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { CategoryType } from "../src/generated/prisma/enums";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const ITEM_CATEGORIES = [
  "Dienstleistung",
  "Produkt",
  "Material",
  "Lizenz",
  "Sonstiges",
];

const EXPENSE_CATEGORIES = [
  "Software",
  "Miete",
  "Bewirtung",
  "Ausstattung",
  "Infrastruktur",
  "Reise",
  "Beratung",
  "Marketing",
  "Sonstiges",
];

async function main() {
  const email = "admin@lexoffice.de";
  const passwordHash = await bcrypt.hash("admin1234", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Administrator", companyName: "MMXeron", passwordHash },
    create: {
      email,
      name: "Administrator",
      passwordHash,
      companyName: "MMXeron",
      country: "Deutschland",
      isSmallBiz: false,
      invoiceSeq: 0,
      creditNoteSeq: 0,
    },
  });

  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.invoice.deleteMany({ where: { userId: user.id } });
  await prisma.item.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({ where: { userId: user.id } });
  await prisma.customer.deleteMany({});

  await prisma.category.createMany({
    data: [
      ...ITEM_CATEGORIES.map((name) => ({
        userId: user.id,
        name,
        type: CategoryType.ITEM,
      })),
      ...EXPENSE_CATEGORIES.map((name) => ({
        userId: user.id,
        name,
        type: CategoryType.EXPENSE,
      })),
    ],
  });

  console.log(`Seeded admin user ${email} (password: admin1234).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
