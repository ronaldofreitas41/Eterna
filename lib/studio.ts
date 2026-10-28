import { z } from "zod";
import type { SiteDesign } from "./design";
import { SECTIONS, SectionId, normalizeSections } from "./sections";
import { Palette, Theme, parseTheme } from "./theme";

// Contrato comum entre o estúdio com IA e o modo demonstrativo.

export const LOCKABLE = {
  palette: "Cores",
  fonts: "Tipografia",
  composition: "Composição",
  texts: "Textos",
} as const;
export type LockKey = keyof typeof LOCKABLE;

export type ProposalContent = Partial<Pick<SiteDesign["content"], "inviteLine" | "tagline" | "story" | "thankYou">>;

export type Proposal = {
  label: string;
  summary: string;
  theme: Theme;
  sectionOrder: SectionId[] | null;
  content: ProposalContent;
};

export type StudioReply = { reply: string; proposals: Proposal[]; simulated: boolean };

export const ProposalsSchema = z.array(
  z.object({
    label: z.string(),
    summary: z.string(),
    theme: z.unknown(),
    sectionOrder: z.array(z.string()).nullable(),
    content: z.record(z.string(), z.string()),
  }),
);

/** Aplica uma proposta ao design atual, respeitando o que os noivos travaram. */
export function applyProposal(design: SiteDesign, p: Proposal, locks: Set<LockKey>): SiteDesign {
  const cur = design.theme;
  const theme: Theme = {
    ...p.theme,
    palette: locks.has("palette") ? cur.palette : p.theme.palette,
    displayFont: locks.has("fonts") ? cur.displayFont : p.theme.displayFont,
    bodyFont: locks.has("fonts") ? cur.bodyFont : p.theme.bodyFont,
    layout: locks.has("composition") ? cur.layout : p.theme.layout,
    navStyle: locks.has("composition") ? cur.navStyle : p.theme.navStyle,
  };

  let sections = design.sections;
  if (p.sectionOrder && !locks.has("composition")) {
    const order = p.sectionOrder.filter((id): id is SectionId => id in SECTIONS);
    const byId = new Map(design.sections.map((s) => [s.id, s]));
    sections = normalizeSections([...order.map((id) => byId.get(id) ?? { id, enabled: true }), ...design.sections]);
  }

  const content = { ...design.content };
  if (!locks.has("texts")) {
    for (const [k, v] of Object.entries(p.content) as [keyof ProposalContent, string | undefined][]) {
      if (typeof v === "string" && v.trim()) content[k] = v.trim();
    }
  }
  return { theme, sections, content };
}

/** Normaliza o que vier do banco ou da API (valores inválidos caem no tema atual). */
export function parseProposals(raw: unknown, fallback: Theme): Proposal[] {
  const parsed = ProposalsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.map((p) => ({
    label: p.label,
    summary: p.summary,
    theme: parseTheme({ ...fallback, ...(p.theme as object), palette: { ...fallback.palette, ...((p.theme as Theme)?.palette ?? {}) } }),
    sectionOrder: (p.sectionOrder?.filter((id) => id in SECTIONS) as SectionId[]) ?? null,
    content: p.content as ProposalContent,
  }));
}

export type ReferencePalette = { index: number; palette: Palette };
