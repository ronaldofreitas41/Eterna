"use server";

import { guard, text, type Result } from "@/lib/action";
import { one, query, tx } from "@/lib/db";
import { deleteFiles, fileUrl, saveFile } from "@/lib/files";
import { ActionError, isUuid, ownedWeddingOrThrow } from "@/lib/panel";

export type RefView = { id: string; fileId: string | null; url: string | null; note: string; displayUrl: string | null };
const MAX_REFS = 8;

async function refCount(weddingId: string) {
  return (await one<{ n: number }>("select count(*)::int as n from design_references where wedding_id = $1", [weddingId]))!.n;
}

export async function uploadReference(form: FormData): Promise<Result<RefView>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(form.get("weddingId"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new ActionError("Escolham uma imagem.");
    const n = await refCount(wedding.id);
    if (n >= MAX_REFS) throw new ActionError(`Vocês podem ter até ${MAX_REFS} referências.`);
    return tx(async (db) => {
      const fileId = await saveFile(wedding.id, "reference", file, db);
      const row = await one<{ id: string }>("insert into design_references (wedding_id, file_id, position) values ($1, $2, $3) returning id", [wedding.id, fileId, n], db);
      return { id: row!.id, fileId, url: null, note: "", displayUrl: fileUrl(fileId) };
    });
  });
}

export async function addReferenceUrl(weddingId: string, raw: string): Promise<Result<RefView>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    let url: URL;
    try {
      url = new URL(raw.trim());
    } catch {
      throw new ActionError("Use um endereço de imagem que comece com https://");
    }
    if (url.protocol !== "https:") throw new ActionError("Use um endereço de imagem que comece com https://");
    const n = await refCount(wedding.id);
    if (n >= MAX_REFS) throw new ActionError(`Vocês podem ter até ${MAX_REFS} referências.`);
    const row = await one<{ id: string }>("insert into design_references (wedding_id, url, position) values ($1, $2, $3) returning id", [wedding.id, url.toString(), n]);
    return { id: row!.id, fileId: null, url: url.toString(), note: "", displayUrl: url.toString() };
  });
}

export async function updateReferenceNote(weddingId: string, id: string, note: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Referência não encontrada.");
    await query("update design_references set note = $1 where id = $2 and wedding_id = $3", [text(note, 300), id, wedding.id]);
    return null;
  });
}

export async function deleteReference(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Referência não encontrada.");
    await tx(async (db) => {
      const ref = await one<{ file_id: string | null }>("delete from design_references where id = $1 and wedding_id = $2 returning file_id", [id, wedding.id], db);
      if (ref) await deleteFiles(wedding.id, [ref.file_id], db);
    });
    return null;
  });
}

export async function addStudioMessages(
  weddingId: string,
  rows: { role: "user" | "assistant"; content: string; proposals: unknown[]; simulated: boolean }[],
): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    for (const r of rows.slice(0, 4)) {
      await query("insert into studio_messages (wedding_id, role, content, proposals, simulated) values ($1, $2, $3, $4, $5)", [
        wedding.id,
        r.role === "assistant" ? "assistant" : "user",
        text(r.content, 6000) || "(vazio)",
        Array.isArray(r.proposals) && r.proposals.length ? JSON.stringify(r.proposals.slice(0, 3)) : null,
        Boolean(r.simulated),
      ]);
    }
    return null;
  });
}
