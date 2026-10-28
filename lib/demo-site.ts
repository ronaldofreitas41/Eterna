import { DEMO_CHAPTERS, DEMO_CONTRIBUTIONS, DEMO_COUPLE, DEMO_DESIGN, DEMO_GALLERY_TONES, DEMO_LOGISTICS, DEMO_SCHEDULE } from "./demo";
import type { SiteData } from "./site";

/** O casamento de demonstração montado em memória, para a página de exemplo (sem banco de dados). */
export function demoSiteData(): SiteData {
  const published = DEMO_CONTRIBUTIONS.map((c, i) => ({ ...c, id: `demo-${i}` })).filter((c) => c.status === "published");
  return {
    wedding: {
      id: "demo",
      slug: DEMO_COUPLE.slug,
      partner_one: DEMO_COUPLE.partner_one,
      partner_two: DEMO_COUPLE.partner_two,
      wedding_date: DEMO_COUPLE.wedding_date,
      city: DEMO_COUPLE.city,
      venue: DEMO_COUPLE.venue,
      phase: "auto",
      live_notice: DEMO_COUPLE.live_notice,
      mission: DEMO_COUPLE.mission,
      capsule_open_date: DEMO_COUPLE.capsule_open_date,
      accepting_contributions: true,
      open_rsvp: true,
      is_demo: true,
    },
    design: DEMO_DESIGN,
    schedule: DEMO_SCHEDULE.map((s, i) => ({ ...s, id: `s${i}`, day: null })),
    chapters: DEMO_CHAPTERS.map((ch, ci) => ({
      id: `c${ci}`,
      title: ch.title,
      intro: ch.intro,
      entries: published
        .filter((c) => c.chapter === ci)
        .map((c) => ({ id: c.id, title: c.title, body: c.body, author_name: c.author_name, relation: c.relation, kind: c.kind, photoUrl: null })),
    })),
    guestbook: [],
    photos: DEMO_GALLERY_TONES.map((tone, i) => ({ id: `p${i}`, url: null, tone, caption: i === 0 ? "Fotos ilustrativas" : "", uploader_name: "" })),
    coverUrl: null,
    logistics: DEMO_LOGISTICS,
    campaigns: [
      { id: "cp0", title: "Conte uma lembrança que você tem de nós", prompt: "Pode ser engraçada, emocionante ou só um detalhe que ficou.", kind: "memory", audience: "everyone", group_ids: [] },
      { id: "cp1", title: "Uma mensagem para abrirmos no nosso aniversário", prompt: "Ela fica lacrada até 15 de maio de 2028.", kind: "capsule", audience: "everyone", group_ids: [] },
    ],
    capsule: { count: 18, open_date: DEMO_COUPLE.capsule_open_date, is_open: false },
    invitation: null,
  };
}
