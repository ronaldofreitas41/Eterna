"use server";

import { revalidatePath } from "next/cache";
import { AiError, generateStudioReply, isAiConfigured, type StudioReference } from "@/lib/ai";
import { guard, text, type Result } from "@/lib/action";
import { parseDesign, type SiteDesign } from "@/lib/design";
import { one, query } from "@/lib/db";
import { ActionError, ownedWeddingOrThrow } from "@/lib/panel";
import { PRESETS } from "@/lib/presets";
import type { Proposal } from "@/lib/studio";
import { runDemoCommand } from "@/lib/studio-demo";
import type { WeddingDraft } from "@/lib/types";

// Criação guiada: a noiva descreve o casamento e recebe uma primeira versão real do site.

export type FirstVersion = { proposals: Proposal[]; simulated: boolean; message: string; base: SiteDesign };

export async function saveDream(weddingId: string, description: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await query(
      "insert into wedding_drafts (wedding_id, style) values ($1, $2) on conflict (wedding_id) do update set style = excluded.style",
      [wedding.id, text(description, 400)],
    );
    return null;
  });
}

const FIRST_VERSION_REQUEST = (style: string, avoid: string[]) =>
  [
    `Criem a primeira versão do site a partir desta descrição dos noivos: "${style || "elegante e atemporal"}".`,
    "Usem as imagens de referência, se houver, para orientar cores, ornamentos e composição.",
    "Escrevam também a frase do convite, uma frase de abertura e uma história curta (até 2 parágrafos), usando só as informações fornecidas. Se faltar informação, escrevam um texto acolhedor e genérico, sem inventar fatos sobre o casal.",
    avoid.length ? `Tragam estilos diferentes destes, que os noivos já viram: ${avoid.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

export async function generateFirstVersion(weddingId: string, avoid: string[] = []): Promise<Result<FirstVersion>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const draft = await one<WeddingDraft>("select * from wedding_drafts where wedding_id = $1", [wedding.id]);
    const design = parseDesign(draft?.design);
    const style = draft?.style ?? "";

    if (!isAiConfigured()) {
      // Sem o assistente configurado, não fingimos uma criação: usamos estilos prontos e avisamos.
      const fromText = runDemoCommand(style, design, []).proposals;
      const presets = PRESETS.filter((p) => !avoid.includes(p.name)).map(
        (p): Proposal => ({ label: p.name, summary: p.description, theme: p.theme, sectionOrder: null, content: { tagline: "Com muita alegria, queremos celebrar esse dia com quem faz parte da nossa história." } }),
      );
      const proposals = [...fromText.filter((p) => !avoid.includes(p.label)), ...presets].slice(0, 2);
      return {
        proposals,
        base: design,
        simulated: true,
        message: "Esta é uma versão de demonstração montada com estilos prontos. Quando o assistente de criação for configurado, ele vai ler a descrição e as imagens de vocês.",
      };
    }

    const refs = await query<{ note: string; url: string | null; mime: string | null; data: Buffer | null }>(
      `select r.note, r.url, f.mime, f.data from design_references r left join files f on f.id = r.file_id
        where r.wedding_id = $1 order by r.position, r.created_at limit 8`,
      [wedding.id],
    );
    const references: StudioReference[] = refs.flatMap((r): StudioReference[] => {
      if (r.url) return [{ kind: "url", note: r.note, url: r.url }];
      if (r.data && r.mime) return [{ kind: "image", note: r.note, mediaType: r.mime, base64: r.data.toString("base64") }];
      return [];
    });
    try {
      const out = await generateStudioReply({
        request: FIRST_VERSION_REQUEST(style, avoid),
        couple: { partnerOne: wedding.partner_one, partnerTwo: wedding.partner_two, date: wedding.wedding_date ?? "", venue: wedding.venue, city: wedding.city, style },
        design,
        locks: [],
        history: [],
        references,
      });
      revalidatePath(`/painel/${wedding.id}`, "layout");
      return { proposals: out.proposals, simulated: false, message: out.reply, base: design };
    } catch (err) {
      if (err instanceof AiError) throw new ActionError(err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// Memórias compartilhadas: ligadas só quando a noiva quiser
// ---------------------------------------------------------------------------

const DEFAULT_CAMPAIGNS = [
  { title: "Conte uma lembrança que você tem de nós", prompt: "Pode ser engraçada, emocionante ou só um detalhe que ficou.", kind: "memory", audience: "everyone" },
  { title: "Envie uma fotografia antiga", prompt: "Fotos de infância, de viagens ou daquela festa inesquecível.", kind: "photo", audience: "everyone" },
  { title: "Deixe um conselho para a nossa vida a dois", prompt: "O que você aprendeu e gostaria que a gente soubesse.", kind: "advice", audience: "everyone" },
  { title: "Uma mensagem para abrirmos no futuro", prompt: "Ela fica lacrada até a data escolhida pelos noivos.", kind: "capsule", audience: "everyone" },
] as const;

export async function setMemories(weddingId: string, on: boolean): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (on) {
      const has = await one<{ n: number }>("select count(*)::int as n from campaigns where wedding_id = $1", [wedding.id]);
      if (!has?.n)
        for (const [position, c] of DEFAULT_CAMPAIGNS.entries())
          await query("insert into campaigns (wedding_id, title, prompt, kind, audience, active, position) values ($1, $2, $3, $4, $5, $6, $7)", [
            wedding.id,
            c.title,
            c.prompt,
            c.kind,
            c.audience,
            c.kind !== "capsule" || Boolean(wedding.capsule_open_date),
            position,
          ]);
    }
    await query("update weddings set accepting_contributions = $1 where id = $2", [on, wedding.id]);
    revalidatePath(`/painel/${wedding.id}`, "layout");
    revalidatePath(`/c/${wedding.slug}`);
    return null;
  });
}
