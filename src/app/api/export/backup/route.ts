import { getLocalUserId } from "@/auth";
import { BACKUP_APP, buildBackup } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getLocalUserId();

  const backup = await buildBackup(userId);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${BACKUP_APP}-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
