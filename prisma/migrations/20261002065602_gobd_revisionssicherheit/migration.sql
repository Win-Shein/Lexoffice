-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'INVOICE',
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "performanceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" DATETIME,
    "sellerSnapshot" TEXT,
    "customerSnapshot" TEXT,
    "contentHash" TEXT,
    "originalInvoiceId" TEXT,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subtotalNet" REAL NOT NULL,
    "vatRate" REAL NOT NULL DEFAULT 19.0,
    "vatAmount" REAL NOT NULL,
    "totalGross" REAL NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'STANDARD_19',
    "isSmallBiz" BOOLEAN NOT NULL DEFAULT false,
    "isReverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paidAt" DATETIME,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "customerId", "dueDate", "id", "invoiceNumber", "isReverseCharge", "isSmallBiz", "issueDate", "notes", "paidAt", "performanceDate", "sentAt", "status", "subtotalNet", "taxType", "totalGross", "updatedAt", "userId", "vatAmount", "vatRate") SELECT "createdAt", "customerId", "dueDate", "id", "invoiceNumber", "isReverseCharge", "isSmallBiz", "issueDate", "notes", "paidAt", "performanceDate", "sentAt", "status", "subtotalNet", "taxType", "totalGross", "updatedAt", "userId", "vatAmount", "vatRate" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Deutschland',
    "phone" TEXT,
    "taxNumber" TEXT,
    "vatId" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "bankName" TEXT,
    "isSmallBiz" BOOLEAN NOT NULL DEFAULT false,
    "invoiceSeq" INTEGER NOT NULL DEFAULT 0,
    "creditNoteSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("address", "bankName", "bic", "city", "companyName", "country", "createdAt", "email", "iban", "id", "invoiceSeq", "isSmallBiz", "name", "passwordHash", "phone", "postalCode", "taxNumber", "updatedAt", "vatId") SELECT "address", "bankName", "bic", "city", "companyName", "country", "createdAt", "email", "iban", "id", "invoiceSeq", "isSmallBiz", "name", "passwordHash", "phone", "postalCode", "taxNumber", "updatedAt", "vatId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
