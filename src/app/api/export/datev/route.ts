import { auth } from "@/auth";
import { exportDatevCsv } from "@/lib/datev-export";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const { csv, filename } = await exportDatevCsv(session.user.id);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
