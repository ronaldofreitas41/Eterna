import { NextResponse } from "next/server";
import { z } from "zod";
import { AiRefusalError, StudioReference, generateStudioReply, isAiConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { parseDesign } from "@/lib/design";
import { LOCKABLE, LockKey } from "@/lib/studio";
import type { StudioMessage, Wedding, WeddingDraft } from "@/lib/types";

export const maxDuration = 300;

const Body = z.object({
  weddingId: z.string().uuid(),
  request: z.string().trim().min(3).max(4000),
  locks: z.array(z.enum(Object.keys(LOCKABLE) as [LockKey, ...LockKey[]])).default([]),
  // O design que está na tela (pode ter alterações ainda não salvas).
  design: z.unknown(),
});

const MAX_REFERENCES = 8;

export async function POST(req: Request) {
  if (!isAiConfigured())
    return NextResponse.json({ error: "A IA não está configurada. O estúdio está em modo demonstrativo.", demo: true }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Descrevam o que querem mudar." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entrem na conta para usar o estúdio." }, { status: 401 });
  const wedding = await one<Wedding>("select * from weddings where id = $1 and owner_id = $2", [parsed.data.weddingId, user.id]);
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado." }, { status: 404 });

  const [draft, refs, history] = await Promise.all([
    one<WeddingDraft>("select * from wedding_drafts where wedding_id = $1", [wedding.id]),
    query<{ note: string; url: string | null; mime: string | null; data: Buffer | null }>(
      `select r.note, r.url, f.mime, f.data from design_references r left join files f on f.id = r.file_id
        where r.wedding_id = $1 order by r.position, r.created_at limit ${MAX_REFERENCES}`,
      [wedding.id],
    ),
    query<Pick<StudioMessage, "role" | "content">>("select role, content from studio_messages where wedding_id = $1 order by created_at desc limit 10", [wedding.id]),
  ]);

  const references: StudioReference[] = refs.flatMap((r): StudioReference[] => {
    if (r.url) return [{ kind: "url", note: r.note, url: r.url }];
    if (r.data && r.mime) return [{ kind: "image", note: r.note, mediaType: r.mime as "image/jpeg", base64: r.data.toString("base64") }];
    return [];
  });

  try {
    const result = await generateStudioReply({
      request: parsed.data.request,
      couple: {
        partnerOne: wedding.partner_one,
        partnerTwo: wedding.partner_two,
        date: wedding.wedding_date ?? "",
        venue: wedding.venue,
        city: wedding.city,
        style: draft?.style ?? "",
      },
      design: parseDesign(parsed.data.design ?? draft?.design),
      locks: parsed.data.locks,
      history: history.reverse(),
      references,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiRefusalError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error("[estudio] falha na IA", err);
    return NextResponse.json({ error: "O estúdio não respondeu agora. Tentem de novo em instantes." }, { status: 502 });
  }
}
