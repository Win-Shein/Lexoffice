-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_type_name_key" ON "Category"("userId", "type", "name");

-- Seed default item categories for every user
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Dienstleistung', 'ITEM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Produkt', 'ITEM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Material', 'ITEM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Lizenz', 'ITEM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Sonstiges', 'ITEM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";

-- Seed default expense categories for every user
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Software', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Miete', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Bewirtung', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Ausstattung', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Infrastruktur', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Reise', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Beratung', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Marketing', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "id", 'Sonstiges', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";

-- Seed categories already used by existing items / expenses
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "userId", "category", 'ITEM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Item" GROUP BY "userId", "category";
INSERT OR IGNORE INTO "Category" ("id", "userId", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "userId", "category", 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Expense" GROUP BY "userId", "category";
