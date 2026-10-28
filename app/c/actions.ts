"use server";

import { classifyContribution, isContributionAiEnabled } from "@/lib/ai";
import { guard, text, type Result } from "@/lib/action";
import { one, query, tx } from "@/lib/db";
import { saveFile } from "@/lib/files";
import { ActionError, isUuid } from "@/lib/panel";
import type { Campaign, ContributionKind, Guest, Wedding } from "@/lib/types";

// Ações dos convidados (sem conta). Tudo é validado aqui: site publicado, convite, campanha, grupo e consentimento.

async function publishedWedding(id: unknown) {
  if (!isUuid(id)) throw new ActionError("Site não encontrado.");
  const w = await one<Wedding>("select * from weddings where id = $1 and published", [id]);
  if (!w) throw new ActionError("Este site não está publicado.");
  return w;
}

async function guestByToken(weddingId: string, token: unknown) {
  if (!isUuid(token)) return null;
  return one<Guest & { max_party_size: number | null }>(
    "select g.*, gr.max_party_size from guests g left join guest_groups gr on gr.id = g.group_id where g.invite_token = $1 and g.wedding_id = $2",
    [token, weddingId],
  );
}

/** Confirmação pelo link aberto do site. */
export async function submitOpenRsvp(input: {
  weddingId: string;
  name: string;
  contact: string;
  attending: boolean;
  partySize: number;
  message: string;
}): Promise<Result> {
  return guard(async () => {
    const w = await publishedWedding(input.weddingId);
    if (!w.open_rsvp) throw new ActionError("A confirmação é feita pelo link do convite individual.");
    const name = text(input.name, 120);
    if (!name) throw new ActionError("Informem o nome.");
    const size = input.attending ? Math.trunc(Number(input.partySize) || 1) : 0;
    if (input.attending && (size < 1 || size > 20)) throw new ActionError("Informem de 1 a 20 pessoas.");
    await query("insert into rsvps (wedding_id, name, contact, attending, party_size, message) values ($1, $2, $3, $4, $5, $6)", [
      w.id,
      name,
      text(input.contact, 160),
      Boolean(input.attending),
      size,
      text(input.message, 1000),
    ]);
    return null;
  });
}

/** Confirmação pelo convite individual, respeitando o limite de pessoas do grupo. */
export async function submitInvitationRsvp(input: {
  weddingId: string;
  token: string;
  attending: boolean;
  partySize: number;
  companions: string;
  message: string;
}): Promise<Result> {
  return guard(async () => {
    const w = await publishedWedding(input.weddingId);
    const guest = await guestByToken(w.id, input.token);
    if (!guest) throw new ActionError("Convite não encontrado. Confiram o link recebido.");
    const max = guest.max_party_size ?? 1;
    const size = input.attending ? Math.trunc(Number(input.partySize) || 1) : 0;
    if (input.attending && (size < 1 || size > max)) throw new ActionError(`Este convite permite até ${max} pessoa(s).`);
    await query(
      "update guests set attending = $1, party_size = $2, companions = $3, rsvp_message = $4, responded_at = now() where id = $5",
      [Boolean(input.attending), size, text(input.companions, 500), text(input.message, 1000), guest.id],
    );
    return null;
  });
}

/** Fotos da galeria colaborativa: entram como pendentes. */
export async function uploadGalleryPhotos(form: FormData): Promise<Result<number>> {
  return guard(async () => {
    const w = await publishedWedding(form.get("weddingId"));
    if (!w.accepting_contributions) throw new ActionError("O envio de fotos está pausado pelos noivos.");
    if (form.get("consent") !== "on") throw new ActionError("Para enviar, autorizem a publicação das fotos.");
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new ActionError("Escolham pelo menos uma foto.");
    if (files.length > 10) throw new ActionError("Enviem até 10 fotos por vez.");
    const name = text(form.get("name"), 80);
    const caption = text(form.get("caption"), 300);
    await tx(async (db) => {
      for (const file of files) {
        const fileId = await saveFile(w.id, "photo", file, db);
        await query("insert into photos (wedding_id, file_id, uploader_name, caption, consent) values ($1, $2, $3, $4, true)", [w.id, fileId, name, caption], db);
      }
    });
    return files.length;
  });
}

const KINDS: ContributionKind[] = ["memory", "photo", "advice", "capsule", "story"];

/** Contribuição do Construir Juntos ou do livro de mensagens. Fica privada até os noivos aprovarem. */
export async function submitContribution(form: FormData): Promise<Result> {
  return guard(async () => {
    const w = await publishedWedding(form.get("weddingId"));
    if (!w.accepting_contributions) throw new ActionError("Os noivos pausaram o recebimento de contribuições.");
    if (form.get("consent") !== "on") throw new ActionError("Para enviar, autorizem o uso da contribuição.");

    const author = text(form.get("name"), 80);
    if (!author) throw new ActionError("Informem o nome.");
    const guest = await guestByToken(w.id, form.get("token"));

    let campaign: Campaign | null = null;
    const campaignId = form.get("campaignId");
    if (campaignId) {
      if (!isUuid(campaignId)) throw new ActionError("Campanha encerrada.");
      campaign = await one<Campaign>("select * from campaigns where id = $1 and wedding_id = $2 and active", [campaignId, w.id]);
      if (!campaign) throw new ActionError("Campanha encerrada.");
      if (campaign.audience !== "everyone" && !guest) throw new ActionError("Esta campanha é só para convidados com convite individual.");
      if (campaign.audience === "groups" && !(guest?.group_id && campaign.group_ids.includes(guest.group_id)))
        throw new ActionError("Esta campanha é para outro grupo de convidados.");
    }

    const requested = String(form.get("kind") ?? "memory") as ContributionKind;
    const kind = campaign?.kind ?? (KINDS.includes(requested) ? requested : "memory");
    const title = text(form.get("title"), 160);
    const body = text(form.get("body"), 4000);
    const relation = text(form.get("relation"), 80);
    const photo = form.get("photo");
    const hasPhoto = photo instanceof File && photo.size > 0 && kind !== "capsule";
    if (!body && !hasPhoto) throw new ActionError(kind === "photo" ? "Escolham a fotografia." : "Escrevam a mensagem.");

    // A IA só sugere o capítulo; nada é publicado sem os noivos. Mensagens da cápsula não são lidas por ninguém.
    let ai = { chapterId: null as string | null, note: "" };
    if (kind !== "capsule" && isContributionAiEnabled()) {
      const chapters = await query<{ id: string; title: string }>("select id, title from story_chapters where wedding_id = $1", [w.id]);
      if (chapters.length) {
        try {
          ai = await classifyContribution({ chapters, kind, author, relation, title, body });
        } catch (err) {
          console.error("[contribuicao] sugestão da IA falhou", err);
        }
      }
    }

    await tx(async (db) => {
      const fileId = hasPhoto ? await saveFile(w.id, "memory", photo as File, db) : null;
      await query(
        `insert into contributions (wedding_id, campaign_id, guest_id, kind, title, author_name, relation, body, photo_file_id, consent, status, ai_chapter_id, ai_note)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $12)`,
        [w.id, campaign?.id ?? null, guest?.id ?? null, kind, title, author, relation, body, fileId, kind === "capsule" ? "capsule" : "pending", ai.chapterId, ai.note],
        db,
      );
    });
    return null;
  });
}
