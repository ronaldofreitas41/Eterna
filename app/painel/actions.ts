"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { DEFAULT_CONTENT, SiteDesign } from "@/lib/design";
import { one, pgCode, query, tx } from "@/lib/db";
import {
  DEMO_CAMPAIGNS,
  DEMO_CHAPTERS,
  DEMO_CONTRIBUTIONS,
  DEMO_COUPLE,
  DEMO_DESIGN,
  DEMO_GROUPS,
  DEMO_GUESTS,
  DEMO_LOGISTICS,
  DEMO_SCHEDULE,
} from "@/lib/demo";
import { ownedWeddingOrThrow } from "@/lib/panel";
import { presetById } from "@/lib/presets";
import { SECTION_IDS, SectionId } from "@/lib/sections";
import { DEFAULT_THEME, HEX, Theme } from "@/lib/theme";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/** Cria o casamento tentando o endereço pedido e, se já existir, variações com sufixo. */
async function insertWedding(db: PoolClient, row: Record<string, unknown>, baseSlug: string) {
  const base = baseSlug.length >= 3 ? baseSlug : `casamento-${baseSlug}`.replace(/-+$/, "");
  const cols = Object.keys(row);
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    await query("savepoint slug_try", [], db);
    try {
      const w = await one<{ id: string }>(
        `insert into weddings (${cols.join(", ")}, slug) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}, $${cols.length + 1}) returning id`,
        [...cols.map((c) => row[c]), slug],
        db,
      );
      return w!.id;
    } catch (err) {
      await query("rollback to savepoint slug_try", [], db);
      if (pgCode(err) !== "23505") throw err;
    }
  }
  throw new Error("Não foi possível reservar um endereço para o site.");
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const Onboarding = z.object({
  partnerOne: z.string().trim().min(1).max(80),
  partnerTwo: z.string().trim().min(1).max(80),
  date: DATE,
  city: z.string().trim().max(120),
  venue: z.string().trim().max(160),
  presetId: z.string().nullable(),
  style: z.string().trim().max(400),
  palette: z.object({ background: z.string(), surface: z.string(), ink: z.string(), muted: z.string(), accent: z.string() }).nullable(),
  phaseMode: z.enum(["auto", "antes"]),
  acceptingContributions: z.boolean(),
  openRsvp: z.boolean(),
  capsuleDate: DATE,
  features: z.array(z.string()),
});
export type OnboardingInput = z.infer<typeof Onboarding>;

const DEFAULT_CHAPTER_TITLES = ["Antes de se conhecerem", "O encontro", "Conselhos para a vida a dois"];
// Funcionalidades opcionais do onboarding. As seções básicas (capa, história, programação...) ficam sempre ligadas.
const OPTIONAL: SectionId[] = ["rsvp", "gifts", "together", "gallery", "guestbook", "capsule", "faq", "timeline", "logistics"];

export async function createWeddingFromOnboarding(input: OnboardingInput): Promise<{ id?: string; error?: string }> {
  const parsed = Onboarding.safeParse(input);
  if (!parsed.success) return { error: "Preencham o nome dos dois noivos." };
  const o = parsed.data;
  const user = await requireUser();

  const base: Theme = presetById(o.presetId ?? "")?.theme ?? DEFAULT_THEME;
  const palette = o.palette && Object.values(o.palette).every((v) => HEX.test(v)) ? (o.palette as Theme["palette"]) : base.palette;
  const features = new Set(o.features.filter((f): f is SectionId => (SECTION_IDS as string[]).includes(f)));
  const design: SiteDesign = {
    theme: { ...base, palette },
    sections: SECTION_IDS.map((id) => ({ id, enabled: !OPTIONAL.includes(id) || features.has(id) })),
    content: DEFAULT_CONTENT,
  };

  try {
    const id = await tx(async (db) => {
      const id = await insertWedding(
        db,
        {
          owner_id: user.id,
          partner_one: o.partnerOne,
          partner_two: o.partnerTwo,
          wedding_date: o.date,
          city: o.city,
          venue: o.venue,
          phase: o.phaseMode,
          accepting_contributions: o.acceptingContributions,
          open_rsvp: o.openRsvp,
          capsule_open_date: o.capsuleDate,
          onboarding_done: true,
        },
        slugify(`${o.partnerOne}-e-${o.partnerTwo}`),
      );
      await query("insert into wedding_drafts (wedding_id, design, style) values ($1, $2, $3)", [id, design, o.style], db);
      await query("insert into wedding_logistics (wedding_id) values ($1)", [id], db);
      for (const [position, title] of DEFAULT_CHAPTER_TITLES.entries())
        await query("insert into story_chapters (wedding_id, title, position) values ($1, $2, $3)", [id, title, position], db);
      if (features.has("together"))
        for (const [position, c] of DEMO_CAMPAIGNS.entries())
          await query("insert into campaigns (wedding_id, title, prompt, kind, audience, active, position) values ($1, $2, $3, $4, $5, $6, $7)", [
            id,
            c.title,
            c.kind === "capsule" ? "Ela fica lacrada até a data escolhida pelos noivos." : c.prompt,
            c.kind,
            c.audience,
            c.kind !== "capsule" || Boolean(o.capsuleDate),
            position,
          ], db);
      return id;
    });
    revalidatePath("/painel");
    return { id };
  } catch (err) {
    console.error("[onboarding]", err);
    return { error: "Não foi possível criar o casamento. Tentem de novo." };
  }
}

// ---------------------------------------------------------------------------
// Casamento de demonstração (dados fictícios, identificado como demonstração)
// ---------------------------------------------------------------------------

export async function createDemoWedding() {
  const user = await requireUser();
  const id = await tx(async (db) => {
    const id = await insertWedding(
      db,
      {
        owner_id: user.id,
        is_demo: true,
        plan: "premium",
        partner_one: DEMO_COUPLE.partner_one,
        partner_two: DEMO_COUPLE.partner_two,
        wedding_date: DEMO_COUPLE.wedding_date,
        city: DEMO_COUPLE.city,
        venue: DEMO_COUPLE.venue,
        capsule_open_date: DEMO_COUPLE.capsule_open_date,
        live_notice: DEMO_COUPLE.live_notice,
        mission: DEMO_COUPLE.mission,
        onboarding_done: true,
      },
      DEMO_COUPLE.slug,
    );
    const ins = async <T,>(sql: string, params: unknown[]) => (await one<T & { id: string }>(sql + " returning id", params, db))!.id;

    const chapters = [];
    for (const [i, c] of DEMO_CHAPTERS.entries())
      chapters.push(await ins("insert into story_chapters (wedding_id, title, intro, position) values ($1, $2, $3, $4)", [id, c.title, c.intro, i]));
    const groups = [];
    for (const [i, g] of DEMO_GROUPS.entries())
      groups.push(
        await ins("insert into guest_groups (wedding_id, name, max_party_size, sees_logistics, message, position) values ($1, $2, $3, $4, $5, $6)", [
          id, g.name, g.max_party_size, g.sees_logistics, g.message, i,
        ]),
      );
    const campaigns = [];
    for (const [i, c] of DEMO_CAMPAIGNS.entries())
      campaigns.push(
        await ins("insert into campaigns (wedding_id, title, prompt, kind, audience, position) values ($1, $2, $3, $4, $5, $6)", [id, c.title, c.prompt, c.kind, c.audience, i]),
      );

    await query("insert into wedding_drafts (wedding_id, design, style) values ($1, $2, $3)", [id, DEMO_DESIGN, DEMO_COUPLE.style], db);
    await query("insert into wedding_logistics (wedding_id, address, accommodation, transport) values ($1, $2, $3, $4)", [
      id, DEMO_LOGISTICS.address, DEMO_LOGISTICS.accommodation, DEMO_LOGISTICS.transport,
    ], db);
    for (const [i, s] of DEMO_SCHEDULE.entries())
      await query("insert into schedule_items (wedding_id, starts_at, title, location, description, position) values ($1, $2, $3, $4, $5, $6)", [
        id, s.starts_at, s.title, s.location, s.description, i,
      ], db);
    await query("insert into tasks (wedding_id, title, done, due_date) values ($1, $2, false, '2027-02-01'), ($1, $3, true, null)", [
      id, "Enviar os convites individuais para a família", "Escolher a paleta final no estúdio",
    ], db);
    for (const g of DEMO_GUESTS)
      await query("insert into guests (wedding_id, group_id, name, contact, attending, party_size, responded_at) values ($1, $2, $3, $4, $5, $6, $7)", [
        id, groups[g.group] ?? null, g.name, g.contact, g.attending, g.party_size, g.attending === null ? null : new Date(),
      ], db);
    // Inclui uma mensagem lacrada na cápsula: os noivos só veem a contagem até a data.
    for (const c of DEMO_CONTRIBUTIONS)
      await query(
        `insert into contributions (wedding_id, campaign_id, chapter_id, kind, title, author_name, relation, body, consent, status, ai_note)
         values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)`,
        [id, campaigns[c.campaign] ?? null, c.chapter === null ? null : chapters[c.chapter], c.kind, c.title, c.author_name, c.relation, c.body, c.status, c.ai_note],
        db,
      );

    // Publica a primeira versão para o site público funcionar de imediato.
    const version = await ins("insert into site_versions (wedding_id, label, source, snapshot) values ($1, 'Versão inicial da demonstração', 'publicacao', $2)", [id, DEMO_DESIGN]);
    await query("update weddings set published = true, published_version_id = $1 where id = $2", [version, id], db);
    return id;
  });
  revalidatePath("/painel");
  redirect(`/painel/${id}`);
}

// ---------------------------------------------------------------------------
// Exclusão definitiva
// ---------------------------------------------------------------------------

export async function deleteWedding(id: string, confirmation: string): Promise<{ error?: string }> {
  let wedding;
  try {
    ({ wedding } = await ownedWeddingOrThrow(id));
  } catch {
    return { error: "Casamento não encontrado." };
  }
  if (confirmation.trim() !== wedding.slug) return { error: `Digitem ${wedding.slug} para confirmar.` };
  // Arquivos, convidados, contribuições e versões são apagados em cascata.
  await query("delete from weddings where id = $1", [wedding.id]);
  revalidatePath("/painel");
  redirect("/painel");
}
