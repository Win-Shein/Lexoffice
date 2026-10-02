import { getLocalUserId } from "@/auth";
import { generatePdfBuffer } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getLocalUserId();
  const { id } = await params;
  const result = await generatePdfBuffer(id, userId);

  if (!result) {
    return new Response("Rechnung nicht gefunden", { status: 404 });
  }

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
