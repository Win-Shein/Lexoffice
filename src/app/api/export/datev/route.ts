import { auth } from "@/auth";
import { exportDatevCsv } from "@/lib/datev-export";

export const runtime = "nodejs";

const isDate = (value: string | null): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const range: { from?: string; to?: string } = {};
  if (isDate(fromParam)) range.from = fromParam;
  if (isDate(toParam)) range.to = toParam;

  const { csv, filename } = await exportDatevCsv(session.user.id, range);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
