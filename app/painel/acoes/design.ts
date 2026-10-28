"use server";

import { revalidatePath } from "next/cache";
import { guard, text, type Result } from "@/lib/action";
import { parseDesign } from "@/lib/design";
import { one, query, tx } from "@/lib/db";
import { ownedWeddingOrThrow } from "@/lib/panel";
import type { SiteVersion } from "@/lib/types";

export type VersionRow = Pick<SiteVersion, "id" | "label" | "source" | "created_at" | "snapshot">;
const SOURCES = ["manual", "estudio", "publicacao", "restauracao"] as const;

export async function saveDraft(weddingId: string, design: unknown): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    // O design é revalidado no servidor: campos inválidos caem no padrão em vez de serem gravados.
    await query(
      "insert into wedding_drafts (wedding_id, design) values ($1, $2) on conflict (wedding_id) do update set design = excluded.design",
      [wedding.id, parseDesign(design)],
    );
    return null;
  });
}

export async function saveVersion(weddingId: string, label: string, source: VersionRow["source"], design: unknown): Promise<Result<VersionRow>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const row = await one<VersionRow>(
      "insert into site_versions (wedding_id, label, source, snapshot) values ($1, $2, $3, $4) returning id, label, source, created_at, snapshot",
      [wedding.id, text(label, 120), SOURCES.includes(source) ? source : "manual", parseDesign(design)],
    );
    return row!;
  });
}

/** Salva o rascunho, cria a versão de publicação e coloca o site no ar, tudo numa transação. */
export async function publishSite(weddingId: string, design: unknown): Promise<Result<VersionRow>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const clean = parseDesign(design);
    const version = await tx(async (db) => {
      await query(
        "insert into wedding_drafts (wedding_id, design) values ($1, $2) on conflict (wedding_id) do update set design = excluded.design",
        [wedding.id, clean],
        db,
      );
      const v = await one<VersionRow>(
        "insert into site_versions (wedding_id, label, source, snapshot) values ($1, 'Publicação', 'publicacao', $2) returning id, label, source, created_at, snapshot",
        [wedding.id, clean],
        db,
      );
      await query("update weddings set published = true, published_version_id = $1 where id = $2", [v!.id, wedding.id], db);
      return v!;
    });
    revalidatePath(`/c/${wedding.slug}`);
    revalidatePath(`/painel/${wedding.id}`, "layout");
    return version;
  });
}

export async function unpublishSite(weddingId: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await query("update weddings set published = false where id = $1", [wedding.id]);
    revalidatePath(`/painel/${wedding.id}`, "layout");
    return null;
  });
}
