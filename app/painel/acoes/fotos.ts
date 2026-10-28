"use server";

import { guard, type Result } from "@/lib/action";
import { one, query, tx } from "@/lib/db";
import { deleteFiles, fileUrl, saveFile } from "@/lib/files";
import { ActionError, isUuid, ownedWeddingOrThrow } from "@/lib/panel";
import type { Photo } from "@/lib/types";

const STATUSES: Photo["status"][] = ["pending", "approved", "rejected"];

export async function setPhotoStatus(weddingId: string, id: string, status: Photo["status"]): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id) || !STATUSES.includes(status)) throw new ActionError("Foto não encontrada.");
    await query("update photos set status = $1 where id = $2 and wedding_id = $3", [status, id, wedding.id]);
    return null;
  });
}

export async function deletePhoto(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Foto não encontrada.");
    // Apagar o arquivo apaga a linha da foto em cascata.
    const row = await one<{ file_id: string }>("select file_id from photos where id = $1 and wedding_id = $2", [id, wedding.id]);
    if (row) await deleteFiles(wedding.id, [row.file_id]);
    return null;
  });
}

export async function uploadCover(form: FormData): Promise<Result<string>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(form.get("weddingId"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new ActionError("Escolham uma imagem.");
    const fileId = await tx(async (db) => {
      const id = await saveFile(wedding.id, "cover", file, db);
      await query("update weddings set cover_file_id = $1 where id = $2", [id, wedding.id], db);
      await deleteFiles(wedding.id, [wedding.cover_file_id], db);
      return id;
    });
    return fileUrl(fileId)!;
  });
}

export async function removeCover(weddingId: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await deleteFiles(wedding.id, [wedding.cover_file_id]);
    return null;
  });
}
