import "server-only";
import { SiteDesign, parseDesign } from "./design";
import { one, query } from "./db";
import { fileUrl } from "./files";
import type { Audience, Campaign, Chapter, Contribution, ContributionKind, Invitation, Photo, ScheduleItem, Wedding } from "./types";

// Dados que o site público (e a prévia do painel) precisa para renderizar.
// Só entram aqui conteúdos aprovados: contribuições publicadas e fotos aprovadas.

export type SiteWedding = Pick<
  Wedding,
  | "id"
  | "slug"
  | "partner_one"
  | "partner_two"
  | "wedding_date"
  | "city"
  | "venue"
  | "phase"
  | "live_notice"
  | "mission"
  | "capsule_open_date"
  | "accepting_contributions"
  | "open_rsvp"
  | "is_demo"
>;

export type SiteEntry = {
  id: string;
  title: string;
  body: string;
  author_name: string;
  relation: string;
  kind: ContributionKind;
  photoUrl: string | null;
};
export type SiteChapter = { id: string; title: string; intro: string; entries: SiteEntry[] };
export type SitePhoto = { id: string; url: string | null; tone?: string; caption: string; uploader_name: string };
export type SiteCampaign = { id: string; title: string; prompt: string; kind: ContributionKind; audience: Audience; group_ids: string[] };
export type SiteSchedule = Pick<ScheduleItem, "id" | "day" | "starts_at" | "title" | "location" | "description">;
export type CapsuleSummary = { count: number; open_date: string | null; is_open: boolean };

export type SiteData = {
  wedding: SiteWedding;
  design: SiteDesign;
  schedule: SiteSchedule[];
  chapters: SiteChapter[];
  guestbook: SiteEntry[];
  photos: SitePhoto[];
  coverUrl: string | null;
  logistics: { address: string; accommodation: string; transport: string } | null;
  campaigns: SiteCampaign[];
  capsule: CapsuleSummary | null;
  invitation: (Invitation & { token: string }) | null;
  /** Número de revisão para a sincronização entre aparelhos (opcional nas prévias). */
  revision?: number;
};

export function toEntry(c: Contribution): SiteEntry {
  return {
    id: c.id,
    title: c.display_title ?? c.title,
    body: c.display_body ?? c.body,
    author_name: c.author_name,
    relation: c.relation,
    kind: c.kind,
    photoUrl: fileUrl(c.photo_file_id),
  };
}

/** Quantas mensagens a cápsula guarda, sem revelar o conteúdo. */
export async function capsuleSummary(wedding: Pick<Wedding, "id" | "capsule_open_date">): Promise<CapsuleSummary> {
  const row = await one<{ count: number; is_open: boolean }>(
    "select count(*)::int as count, coalesce($2::date <= current_date, false) as is_open from contributions where wedding_id = $1 and status = 'capsule'",
    [wedding.id, wedding.capsule_open_date],
  );
  return { count: row?.count ?? 0, open_date: wedding.capsule_open_date, is_open: row?.is_open ?? false };
}

/** Programação, memórias publicadas, fotos aprovadas, campanhas ativas e cápsula. */
export async function loadLiveData(
  wedding: Pick<Wedding, "id" | "capsule_open_date" | "logistics_public" | "cover_file_id">,
  opts: { includePrivateLogistics: boolean },
): Promise<Omit<SiteData, "wedding" | "design" | "invitation">> {
  const id = wedding.id;
  const [schedule, chapters, contribs, photos, logistics, campaigns, capsule] = await Promise.all([
    query<ScheduleItem>("select * from schedule_items where wedding_id = $1 order by day nulls first, starts_at, position", [id]),
    query<Chapter>("select * from story_chapters where wedding_id = $1 order by position, title", [id]),
    query<Contribution>("select * from contributions where wedding_id = $1 and status = 'published' order by created_at", [id]),
    query<Photo>("select * from photos where wedding_id = $1 and status = 'approved' order by created_at desc limit 120", [id]),
    opts.includePrivateLogistics || wedding.logistics_public
      ? one<{ address: string; accommodation: string; transport: string }>("select address, accommodation, transport from wedding_logistics where wedding_id = $1", [id])
      : Promise.resolve(null),
    query<Campaign>("select * from campaigns where wedding_id = $1 and active order by position, created_at", [id]),
    capsuleSummary(wedding),
  ]);

  return {
    schedule,
    chapters: chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      intro: ch.intro,
      entries: contribs.filter((c) => c.chapter_id === ch.id).map(toEntry),
    })),
    guestbook: contribs.filter((c) => !c.chapter_id).map(toEntry),
    photos: photos.map((p) => ({ id: p.id, url: fileUrl(p.file_id), caption: p.caption, uploader_name: p.uploader_name })),
    coverUrl: fileUrl(wedding.cover_file_id),
    logistics,
    campaigns: campaigns.map((c) => ({ id: c.id, title: c.title, prompt: c.prompt, kind: c.kind, audience: c.audience, group_ids: c.group_ids })),
    capsule,
  };
}

/** Convite individual pelo token: dados do convidado, do grupo e, se permitido, a logística. */
export async function getInvitation(token: string, weddingId: string): Promise<Invitation | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const row = await one<{
    name: string;
    attending: boolean | null;
    party_size: number;
    companions: string;
    rsvp_message: string;
    responded_at: string | null;
    group_id: string | null;
    group_name: string | null;
    max_party_size: number | null;
    group_message: string | null;
    sees_logistics: boolean | null;
    logistics_public: boolean;
  }>(
    `select g.name, g.attending, g.party_size, g.companions, g.rsvp_message, g.responded_at,
            gr.id as group_id, gr.name as group_name, gr.max_party_size, gr.message as group_message, gr.sees_logistics,
            w.logistics_public
       from guests g
       join weddings w on w.id = g.wedding_id and w.published
       left join guest_groups gr on gr.id = g.group_id
      where g.invite_token = $1 and g.wedding_id = $2`,
    [token, weddingId],
  );
  if (!row) return null;
  const logistics =
    row.sees_logistics || row.logistics_public
      ? await one<{ address: string; accommodation: string; transport: string }>("select address, accommodation, transport from wedding_logistics where wedding_id = $1", [weddingId])
      : null;
  return {
    wedding_id: weddingId,
    guest: {
      name: row.name,
      attending: row.attending,
      party_size: row.party_size,
      companions: row.companions,
      rsvp_message: row.rsvp_message,
      responded_at: row.responded_at,
    },
    group: row.group_id ? { id: row.group_id, name: row.group_name!, max_party_size: row.max_party_size!, message: row.group_message ?? "" } : null,
    max_party_size: row.max_party_size ?? 1,
    logistics,
  };
}

/** Site público: design da versão publicada + dados ao vivo + convite individual (se houver token). */
export async function loadPublicSite(slug: string, token: string | null): Promise<SiteData | null> {
  const wedding = await one<Wedding>("select * from weddings where slug = $1 and published", [slug]);
  if (!wedding) return null;

  const [version, live, invitation] = await Promise.all([
    wedding.published_version_id ? one<{ snapshot: unknown }>("select snapshot from site_versions where id = $1", [wedding.published_version_id]) : null,
    loadLiveData(wedding, { includePrivateLogistics: false }),
    token ? getInvitation(token, wedding.id) : null,
  ]);

  return {
    ...live,
    // O convite de um grupo autorizado libera hospedagem e transporte.
    logistics: live.logistics ?? invitation?.logistics ?? null,
    wedding: publicWedding(wedding),
    design: parseDesign(version?.snapshot),
    invitation: invitation ? { ...invitation, token: token! } : null,
    revision: wedding.revision,
  };
}

/** Só os campos do casamento que podem ir para o navegador de um visitante. */
export function publicWedding(w: Wedding): SiteWedding {
  return {
    id: w.id,
    slug: w.slug,
    partner_one: w.partner_one,
    partner_two: w.partner_two,
    wedding_date: w.wedding_date,
    city: w.city,
    venue: w.venue,
    phase: w.phase,
    live_notice: w.live_notice,
    mission: w.mission,
    capsule_open_date: w.capsule_open_date,
    accepting_contributions: w.accepting_contributions,
    open_rsvp: w.open_rsvp,
    is_demo: w.is_demo,
  };
}
