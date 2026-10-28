"use server";

import { guard, text, type Result } from "@/lib/action";
import { one, query, tx } from "@/lib/db";
import { deleteFiles } from "@/lib/files";
import { ActionError, isUuid, ownedWeddingOrThrow } from "@/lib/panel";
import type { Audience, Campaign, Chapter, ContributionKind, ContributionStatus } from "@/lib/types";

// Moderação do Construir Juntos. Mensagens da cápsula não podem ser alteradas nem lidas antes da data.

const MODERATION: ContributionStatus[] = ["pending", "published", "private", "rejected"];

async function checkChapter(weddingId: string, chapterId: string | null) {
  if (chapterId === null) return null;
  if (!isUuid(chapterId) || !(await one("select 1 from story_chapters where id = $1 and wedding_id = $2", [chapterId, weddingId])))
    throw new ActionError("Capítulo não encontrado.");
  return chapterId;
}

export async function moderateContribution(
  weddingId: string,
  id: string,
  patch: { status?: ContributionStatus; chapter_id?: string | null; display_title?: string | null; display_body?: string | null },
): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Contribuição não encontrada.");
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (col: string, v: unknown) => {
      values.push(v);
      sets.push(`${col} = $${values.length}`);
    };
    if (patch.status !== undefined) {
      if (!MODERATION.includes(patch.status)) throw new ActionError("Situação inválida.");
      set("status", patch.status);
    }
    if (patch.chapter_id !== undefined) set("chapter_id", await checkChapter(wedding.id, patch.chapter_id));
    if (patch.display_title !== undefined) set("display_title", patch.display_title === null ? null : text(patch.display_title, 160) || null);
    if (patch.display_body !== undefined) set("display_body", patch.display_body === null ? null : text(patch.display_body, 4000) || null);
    if (!sets.length) return null;
    values.push(id, wedding.id);
    const row = await one(
      `update contributions set ${sets.join(", ")} where id = $${values.length - 1} and wedding_id = $${values.length} and status <> 'capsule' returning id`,
      values,
    );
    if (!row) throw new ActionError("Contribuição não encontrada.");
    return null;
  });
}

export async function deleteContribution(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Contribuição não encontrada.");
    await tx(async (db) => {
      const row = await one<{ photo_file_id: string | null }>("delete from contributions where id = $1 and wedding_id = $2 returning photo_file_id", [id, wedding.id], db);
      if (row) await deleteFiles(wedding.id, [row.photo_file_id], db);
    });
    return null;
  });
}

// ---------------------------------------------------------------------------
// Campanhas
// ---------------------------------------------------------------------------

type CampaignInput = { title: string; prompt: string; kind: ContributionKind; audience: Audience; group_ids: string[]; active: boolean };
const KINDS: ContributionKind[] = ["memory", "photo", "advice", "capsule", "story"];
const AUDIENCES: Audience[] = ["everyone", "invited", "groups"];

async function campaignValues(weddingId: string, c: CampaignInput) {
  const title = text(c.title, 160);
  if (!title) throw new ActionError("Escrevam o convite da campanha.");
  if (!KINDS.includes(c.kind) || !AUDIENCES.includes(c.audience)) throw new ActionError("Formato ou público inválido.");
  const groups = c.audience === "groups" ? c.group_ids.filter(isUuid) : [];
  if (c.audience === "groups") {
    if (!groups.length) throw new ActionError("Escolham pelo menos um grupo.");
    const found = await one<{ n: number }>("select count(*)::int as n from guest_groups where wedding_id = $1 and id = any($2::uuid[])", [weddingId, groups]);
    if (found!.n !== groups.length) throw new ActionError("Algum grupo escolhido não existe.");
  }
  return [title, text(c.prompt, 600), c.kind, c.audience, groups, Boolean(c.active)] as const;
}

export async function createCampaign(weddingId: string, c: CampaignInput): Promise<Result<Campaign>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const v = await campaignValues(wedding.id, c);
    const pos = (await one<{ n: number }>("select count(*)::int as n from campaigns where wedding_id = $1", [wedding.id]))!.n;
    return (await one<Campaign>(
      "insert into campaigns (wedding_id, title, prompt, kind, audience, group_ids, active, position) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *",
      [wedding.id, ...v, pos],
    ))!;
  });
}

export async function updateCampaign(weddingId: string, id: string, c: CampaignInput): Promise<Result<Campaign>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Campanha não encontrada.");
    const row = await one<Campaign>(
      "update campaigns set title = $1, prompt = $2, kind = $3, audience = $4, group_ids = $5, active = $6 where id = $7 and wedding_id = $8 returning *",
      [...(await campaignValues(wedding.id, c)), id, wedding.id],
    );
    if (!row) throw new ActionError("Campanha não encontrada.");
    return row;
  });
}

export async function deleteCampaign(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Campanha não encontrada.");
    await query("delete from campaigns where id = $1 and wedding_id = $2", [id, wedding.id]);
    return null;
  });
}

// ---------------------------------------------------------------------------
// Capítulos
// ---------------------------------------------------------------------------

export async function createChapter(weddingId: string, c: { title: string; intro: string }): Promise<Result<Chapter>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const title = text(c.title, 120);
    if (!title) throw new ActionError("Deem um título ao capítulo.");
    const pos = (await one<{ n: number }>("select count(*)::int as n from story_chapters where wedding_id = $1", [wedding.id]))!.n;
    return (await one<Chapter>("insert into story_chapters (wedding_id, title, intro, position) values ($1, $2, $3, $4) returning *", [wedding.id, title, text(c.intro, 1000), pos]))!;
  });
}

export async function updateChapter(weddingId: string, id: string, c: { title: string; intro: string }): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await checkChapter(wedding.id, id);
    const title = text(c.title, 120);
    if (!title) throw new ActionError("Deem um título ao capítulo.");
    await query("update story_chapters set title = $1, intro = $2 where id = $3 and wedding_id = $4", [title, text(c.intro, 1000), id, wedding.id]);
    return null;
  });
}

export async function deleteChapter(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await checkChapter(wedding.id, id);
    await query("delete from story_chapters where id = $1 and wedding_id = $2", [id, wedding.id]);
    return null;
  });
}
