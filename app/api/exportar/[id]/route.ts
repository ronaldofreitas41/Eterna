import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import type { Wedding } from "@/lib/types";

// Exporta os dados do casamento em JSON (portabilidade, LGPD). Só o dono consegue.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entrem na conta." }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Casamento não encontrado." }, { status: 404 });
  const wedding = await one<Wedding>("select * from weddings where id = $1 and owner_id = $2", [id, user.id]);
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado." }, { status: 404 });

  // Os nomes das tabelas são fixos; nenhum vem da requisição.
  const tables = [
    "wedding_drafts",
    "wedding_logistics",
    "site_versions",
    "schedule_items",
    "tasks",
    "guest_groups",
    "guests",
    "rsvps",
    "story_chapters",
    "campaigns",
    "photos",
    "design_references",
    "studio_messages",
  ];
  const results = await Promise.all(tables.map((t) => query(`select * from ${t} where wedding_id = $1`, [id])));
  const [contributions, files] = await Promise.all([
    // A cápsula continua lacrada na exportação até a data de abertura.
    query(
      `select * from contributions where wedding_id = $1 and (status <> 'capsule' or ($2::date is not null and $2::date <= current_date))`,
      [id, wedding.capsule_open_date],
    ),
    query("select id, kind, mime, size, created_at from files where wedding_id = $1", [id]),
  ]);

  const body = JSON.stringify(
    {
      exportado_em: new Date().toISOString(),
      observacao:
        "As imagens estão listadas em 'arquivos' e podem ser baixadas por /api/arquivos/<id> com a sessão dos noivos. Mensagens da cápsula do tempo só entram depois da data de abertura.",
      casamento: wedding,
      ...Object.fromEntries(tables.map((t, i) => [t, results[i]])),
      contributions,
      arquivos: files,
    },
    null,
    2,
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="eterna-${wedding.slug}.json"`,
    },
  });
}
