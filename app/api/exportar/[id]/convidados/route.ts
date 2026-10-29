import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { one, query } from "@/lib/db";

// Lista de convidados e confirmações em CSV (abre no Excel e no Google Planilhas). Só o dono consegue.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entrem na conta." }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Casamento não encontrado." }, { status: 404 });
  const wedding = await one<{ slug: string }>("select slug from weddings where id = $1 and owner_id = $2", [id, user.id]);
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado." }, { status: 404 });

  const rows = await query<{ origem: string; nome: string; contato: string; grupo: string; resposta: string; pessoas: number; acompanhantes: string; recado: string; respondido_em: string | null }>(
    `select 'Convite individual' as origem, g.name as nome, g.contact as contato, coalesce(gr.name, '') as grupo,
            case when g.attending is null then 'Sem resposta' when g.attending then 'Confirmou' else 'Não vai' end as resposta,
            g.party_size as pessoas, g.companions as acompanhantes, g.rsvp_message as recado, g.responded_at as respondido_em
       from guests g left join guest_groups gr on gr.id = g.group_id where g.wedding_id = $1
     union all
     select 'Link do site', r.name, r.contact, '', case when r.attending then 'Confirmou' else 'Não vai' end,
            r.party_size, '', r.message, r.created_at
       from rsvps r where r.wedding_id = $1
     order by 2`,
    [id],
  );

  // Separador ";" e BOM UTF-8: é o que o Excel em português abre corretamente.
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmulas maliciosas ao abrir no Excel
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ["Origem", "Nome", "Contato", "Grupo", "Resposta", "Pessoas", "Acompanhantes", "Recado", "Respondido em"];
  const lines = rows.map((r) =>
    [r.origem, r.nome, r.contato, r.grupo, r.resposta, r.pessoas, r.acompanhantes, r.recado, r.respondido_em ? new Date(r.respondido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : ""]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="convidados-${wedding.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
