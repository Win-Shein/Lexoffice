import { auth } from "@/auth";
import { generateExpenseListPdf } from "@/components/expense-pdf";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const isDate = (value: string | null): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = isDate(fromParam) ? fromParam : undefined;
  const to = isDate(toParam) ? toParam : undefined;

  const [user, expenses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.expense.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "asc" },
    }),
  ]);

  if (expenses.length === 0) {
    return new Response("Keine Ausgaben im gewählten Zeitraum gefunden.", {
      status: 404,
    });
  }

  const buffer = await generateExpenseListPdf({
    companyName: user?.companyName ?? user?.name ?? "",
    from,
    to,
    expenses: expenses.map((expense) => ({
      date: expense.date,
      description: expense.description,
      vendor: expense.vendor,
      category: expense.category,
      amountNet: expense.amountNet,
      vatAmount: expense.vatAmount,
      amountGross: expense.amountGross,
    })),
  });

  const rangeLabel = `${from ?? "Start"}_${to ?? "Ende"}`;
  const filename = `Ausgaben_${rangeLabel}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
