"use server";

import { revalidatePath } from "next/cache";
import { guard, text, type Result } from "@/lib/action";
import { query } from "@/lib/db";
import { ActionError, ownedWeddingOrThrow } from "@/lib/panel";
import type { Wedding } from "@/lib/types";

export type SettingsPatch = Partial<
  Pick<
    Wedding,
    | "phase"
    | "live_notice"
    | "mission"
    | "accepting_contributions"
    | "open_rsvp"
    | "capsule_open_date"
    | "partner_one"
    | "partner_two"
    | "wedding_date"
    | "city"
    | "venue"
    | "slug"
  >
>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHASES = ["auto", "antes", "durante", "depois"];

/** Atualiza só campos permitidos, cada um validado. */
export async function updateSettings(weddingId: string, patch: SettingsPatch): Promise<Result<SettingsPatch>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch) as [keyof SettingsPatch, unknown][]) {
      switch (k) {
        case "phase":
          if (!PHASES.includes(String(v))) throw new ActionError("Fase inválida.");
          clean[k] = v;
          break;
        case "live_notice":
          clean[k] = text(v, 500);
          break;
        case "mission":
          clean[k] = text(v, 300);
          break;
        case "accepting_contributions":
        case "open_rsvp":
          clean[k] = Boolean(v);
          break;
        case "capsule_open_date":
        case "wedding_date":
          if (v !== null && !DATE.test(String(v))) throw new ActionError("Data inválida.");
          clean[k] = v;
          break;
        case "partner_one":
        case "partner_two":
          clean[k] = text(v, 80);
          if (!clean[k]) throw new ActionError("Os nomes são obrigatórios.");
          break;
        case "city":
          clean[k] = text(v, 120);
          break;
        case "venue":
          clean[k] = text(v, 160);
          break;
        case "slug": {
          const s = String(v ?? "").trim().toLowerCase();
          if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) || s.length < 3 || s.length > 60)
            throw new ActionError("O endereço só pode ter letras minúsculas, números e hífens, com 3 a 60 caracteres.");
          clean[k] = s;
          break;
        }
      }
    }
    const keys = Object.keys(clean);
    if (keys.length) {
      // Os nomes de coluna vêm da lista fixa acima, nunca do cliente.
      await query(`update weddings set ${keys.map((k, i) => `${k} = $${i + 1}`).join(", ")} where id = $${keys.length + 1}`, [
        ...keys.map((k) => clean[k]),
        wedding.id,
      ]);
    }
    revalidatePath(`/painel/${wedding.id}`, "layout");
    revalidatePath(`/c/${wedding.slug}`);
    if (clean.slug) revalidatePath(`/c/${clean.slug}`);
    return clean as SettingsPatch;
  });
}
