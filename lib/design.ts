import { z } from "zod";
import { DEFAULT_THEME, Theme, parseTheme } from "./theme";
import { DEFAULT_SECTIONS, SectionSetting, normalizeSections } from "./sections";

// Tudo o que define a aparência e os textos do site. É o que se salva como rascunho e como versão.

const TimelineItem = z.object({ date: z.string().max(40), title: z.string().max(120), text: z.string().max(1000) });
const FaqItem = z.object({ q: z.string().max(200), a: z.string().max(1500) });
const GiftItem = z.object({
  title: z.string().max(120),
  description: z.string().max(400),
  url: z.string().max(500),
  priceCents: z.number().int().min(0).max(100_000_000).nullable(),
});

export const ContentSchema = z.object({
  inviteLine: z.string().max(140),
  tagline: z.string().max(240),
  story: z.string().max(6000),
  timeline: z.array(TimelineItem).max(30),
  ceremony: z.string().max(1500),
  reception: z.string().max(1500),
  dressCode: z.string().max(1000),
  mapUrl: z.string().max(500),
  faq: z.array(FaqItem).max(30),
  gifts: z.array(GiftItem).max(60),
  giftsNote: z.string().max(600),
  thankYou: z.string().max(3000),
});

export type Content = z.infer<typeof ContentSchema>;
export type TimelineEntry = z.infer<typeof TimelineItem>;
export type FaqEntry = z.infer<typeof FaqItem>;
export type Gift = z.infer<typeof GiftItem>;

export type SiteDesign = { theme: Theme; sections: SectionSetting[]; content: Content };

export const DEFAULT_CONTENT: Content = {
  inviteLine: "Com a bênção de suas famílias",
  tagline: "",
  story: "",
  timeline: [],
  ceremony: "",
  reception: "",
  dressCode: "",
  mapUrl: "",
  faq: [],
  gifts: [],
  giftsNote: "",
  thankYou: "",
};

export const DEFAULT_DESIGN: SiteDesign = { theme: DEFAULT_THEME, sections: DEFAULT_SECTIONS, content: DEFAULT_CONTENT };

/** Lê um design salvo, tolerando campos ausentes ou inválidos (cada campo cai no padrão). */
export function parseDesign(raw: unknown): SiteDesign {
  const r = (raw ?? {}) as Partial<Record<keyof SiteDesign, unknown>>;
  const c = (r.content ?? {}) as Record<string, unknown>;
  const content = { ...DEFAULT_CONTENT };
  for (const key of Object.keys(DEFAULT_CONTENT) as (keyof Content)[]) {
    const one = ContentSchema.shape[key].safeParse(c[key]);
    if (one.success) (content as Record<string, unknown>)[key] = one.data;
  }
  return { theme: parseTheme(r.theme), sections: normalizeSections(r.sections), content };
}

/** Só aceita links http(s), para não injetar outros esquemas no site público. */
export function safeUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const sameDesign = (a: SiteDesign, b: SiteDesign) => JSON.stringify(a) === JSON.stringify(b);
