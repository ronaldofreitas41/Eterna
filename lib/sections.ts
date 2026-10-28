import type { SitePhase } from "./types";

// Componentes do site público. A fase define onde cada um faz sentido; os noivos definem ordem e quais ficam ligados.
export const SECTIONS = {
  countdown: { label: "Contagem regressiva", phases: ["antes"] },
  live: { label: "Avisos e missão ao vivo", phases: ["durante"] },
  thanks: { label: "Agradecimento final", phases: ["depois"] },
  story: { label: "História do casal", phases: ["antes", "durante", "depois"] },
  timeline: { label: "Linha do tempo", phases: ["antes", "durante", "depois"] },
  ceremony: { label: "Cerimônia e recepção", phases: ["antes", "durante"] },
  schedule: { label: "Programação", phases: ["antes", "durante"] },
  location: { label: "Localização e mapa", phases: ["antes", "durante"] },
  dresscode: { label: "Dress code", phases: ["antes", "durante"] },
  logistics: { label: "Hospedagem e transporte", phases: ["antes", "durante"] },
  rsvp: { label: "Confirmação de presença", phases: ["antes"] },
  gifts: { label: "Lista de presentes", phases: ["antes", "durante", "depois"] },
  faq: { label: "Perguntas frequentes", phases: ["antes", "durante"] },
  gallery: { label: "Galeria colaborativa", phases: ["durante", "depois"] },
  together: { label: "Construir Juntos", phases: ["antes", "durante", "depois"] },
  guestbook: { label: "Livro de mensagens", phases: ["antes", "durante", "depois"] },
  capsule: { label: "Cápsula do tempo", phases: ["antes", "durante", "depois"] },
} as const satisfies Record<string, { label: string; phases: readonly SitePhase[] }>;

export type SectionId = keyof typeof SECTIONS;
export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];

export type SectionSetting = { id: SectionId; enabled: boolean };

export const DEFAULT_SECTIONS: SectionSetting[] = SECTION_IDS.map((id) => ({ id, enabled: true }));

/** Normaliza a lista salva: remove ids desconhecidos ou repetidos e acrescenta seções novas no fim. */
export function normalizeSections(raw: unknown): SectionSetting[] {
  const seen = new Set<SectionId>();
  const out: SectionSetting[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const id = (item as SectionSetting)?.id;
      if (id in SECTIONS && !seen.has(id)) {
        seen.add(id);
        out.push({ id, enabled: (item as SectionSetting).enabled !== false });
      }
    }
  }
  for (const id of SECTION_IDS) if (!seen.has(id)) out.push({ id, enabled: true });
  return out;
}

export function visibleSections(sections: SectionSetting[], phase: SitePhase): SectionId[] {
  return sections
    .filter((s) => s.enabled && (SECTIONS[s.id].phases as readonly SitePhase[]).includes(phase))
    .map((s) => s.id);
}

export function moveSection(sections: SectionSetting[], id: SectionId, delta: -1 | 1): SectionSetting[] {
  const i = sections.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= sections.length) return sections;
  const next = [...sections];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
