import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { isUuid } from "@/lib/panel";

// Número de revisão do casamento, consultado pelas telas abertas para saber se algo mudou em outro aparelho.
// Responde ao dono (painel) e, se o site estiver publicado, a qualquer visitante (site público).
// Não revela nada além de um contador.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  const w = await one<{ revision: number; owner_id: string; published: boolean }>("select revision, owner_id, published from weddings where id = $1", [id]);
  if (!w || (!w.published && (await getCurrentUser())?.id !== w.owner_id)) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ revision: w.revision }, { headers: { "Cache-Control": "no-store" } });
}
