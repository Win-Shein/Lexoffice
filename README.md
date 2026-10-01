# MMXeron – Rechnungs- & Buchhaltungssoftware

MMXeron is a full-stack Invoicing & Accounting web app for the German market, built with
**Next.js 16 (App Router, Server Actions, RSC)**, **TypeScript**, **Tailwind CSS v4**,
**Prisma ORM 7 + SQLite**, **Auth.js (NextAuth v5)**, **@react-pdf/renderer** and
**Recharts**.

Compliant with **UStG §14** (Pflichtangaben), **GoBD**, **§19 UStG** (Kleinunternehmer),
**§13b UStG** (Reverse Charge) and **Kleinbetragsrechnung (§33 UStDV)**.

## Features

- **Dashboard** – revenue/expense metrics, open & overdue amounts, 12‑month
  Recharts area chart, recent activity and status distribution.
- **Invoice builder** (`/invoices/new`) – dynamic line items, live totals, a live
  PDF preview, and automatic validation of the mandatory UStG §14 fields.
- **Legal rules** – toggle Kleinunternehmer (§19) and Reverse Charge (§13b);
  automatic legal notices and a Kleinbetragsrechnung hint at ≤ 250 €.
- **PDF** – `@react-pdf/renderer` template served via `/api/invoices/[id]/pdf`.
- **DATEV export** – balanced booking batch (`Buchungsstapel`) as CSV at
  `/api/export/datev`.
- **Customers, Expenses, Settings** – plus sequential, gap‑free invoice numbers
  (`RE-<Jahr>-0001`).
- **EN/DE switch** – cookie‑persisted UI language (German default) in the sidebar
  and on the login screen. The invoice PDF stays German for legal safety.
- **Light / dark / system theme** – `next-themes` with a no‑flash init script,
  toggled from the sidebar and login screen.
- **Backup & restore** – download all data as JSON (`/api/export/backup`) and
  restore it from a file in Settings.
- **Change password** – bcrypt‑verified password update in Settings.

## Getting started

```bash
npm install          # runs `prisma generate`
npm run db:migrate   # create the SQLite schema (prisma/migrations)
npm run db:seed      # demo user, customers, invoices and expenses
npm run dev          # http://localhost:3000
```

### Demo login

| E-Mail                 | Passwort   |
| ---------------------- | ---------- |
| `demo@lexoffice.de`    | `demo1234` |

## Environment

`.env` (git‑ignored) is created by Prisma and additionally needs an Auth.js secret:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="dev-only-secret-change-me"
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Scripts

| Script                | Purpose                              |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Start the dev server (Turbopack)     |
| `npm run build`       | Production build                     |
| `npm run start`       | Run the production build             |
| `npm run typecheck`   | `tsc --noEmit`                       |
| `npm run lint`        | ESLint                               |
| `npm run db:migrate`  | Apply Prisma migrations              |
| `npm run db:seed`     | Seed demo data                       |
| `npm run db:studio`   | Open Prisma Studio                   |
| `npm run db:reset`    | Reset the database and re‑seed       |

## Project structure

```
src/
  app/
    (app)/            # authenticated shell (sidebar) – dashboard, invoices, …
    login/            # credentials login
    api/              # auth, invoice PDF, DATEV export
  actions/            # server actions (invoice, customer, expense, settings, auth)
  components/         # UI + invoice PDF template + forms
  lib/                # db client, VAT math, formatting, DATEV, queries
  generated/prisma/   # generated Prisma client (git-ignored)
prisma/
  schema.prisma       # data model
  seed.ts             # demo data
```

## Notes

- SQLite is used for zero‑setup local development. The Prisma schema only needs
  `provider = "postgresql"` plus a driver adapter swap (`@prisma/adapter-pg`) to
  move to PostgreSQL.
- The generated Prisma client lives in `src/generated/prisma` and is produced by
  `prisma generate` (also run automatically on `postinstall`).
