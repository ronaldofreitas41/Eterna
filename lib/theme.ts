import { z } from "zod";

// Fontes disponíveis para os sites dos casais. Cada uma é carregada em app/layout.tsx com a variável indicada.
export const DISPLAY_FONTS = {
  bodoni: { label: "Bodoni · editorial", css: "var(--font-display), Didot, Georgia, serif" },
  cormorant: { label: "Cormorant · clássica", css: "var(--font-cormorant), Garamond, Georgia, serif" },
  italiana: { label: "Italiana · fina e espaçada", css: "var(--font-thin), Didot, Georgia, serif" },
  marcellus: { label: "Marcellus · romana", css: "var(--font-marcellus), Georgia, serif" },
  pinyon: { label: "Pinyon Script · caligrafia", css: "var(--font-script), cursive" },
} as const;

export const BODY_FONTS = {
  instrument: { label: "Instrument Sans · moderna", css: "var(--font-body), system-ui, sans-serif" },
  figtree: { label: "Figtree · arredondada", css: "var(--font-figtree), system-ui, sans-serif" },
  lora: { label: "Lora · serifada", css: "var(--font-lora), Georgia, serif" },
} as const;

export const LAYOUTS = {
  centered: "Centralizado clássico",
  editorial: "Editorial, alinhado à esquerda",
  split: "Capa dividida com foto",
} as const;

export const NAV_STYLES = {
  center: "Centralizado em caixa alta",
  split: "Distribuído",
  pill: "Pílulas",
} as const;

export const BUTTON_STYLES = {
  solid: "Preenchido",
  outline: "Contorno",
  pill: "Arredondado",
} as const;

export const ORNAMENTS = {
  florals: "Flores delicadas",
  foliage: "Folhagens",
  line: "Linha fina",
  none: "Sem ornamento",
} as const;

type Keys<T> = [keyof T & string, ...(keyof T & string)[]];
export const keysOf = <T extends object>(o: T) => Object.keys(o) as Keys<T>;

export const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = z.string().regex(HEX);

export const ThemeSchema = z.object({
  palette: z.object({
    background: hex,
    surface: hex,
    ink: hex,
    muted: hex,
    accent: hex,
  }),
  displayFont: z.enum(keysOf(DISPLAY_FONTS)),
  bodyFont: z.enum(keysOf(BODY_FONTS)),
  layout: z.enum(keysOf(LAYOUTS)),
  navStyle: z.enum(keysOf(NAV_STYLES)),
  buttonStyle: z.enum(keysOf(BUTTON_STYLES)),
  ornament: z.enum(keysOf(ORNAMENTS)),
});

export type Theme = z.infer<typeof ThemeSchema>;
export type Palette = Theme["palette"];

export const DEFAULT_THEME: Theme = {
  palette: { background: "#FBF8F2", surface: "#F2EDE3", ink: "#22201C", muted: "#6E675C", accent: "#6F8B70" },
  displayFont: "bodoni",
  bodyFont: "instrument",
  layout: "centered",
  navStyle: "center",
  buttonStyle: "solid",
  ornament: "foliage",
};

export function parseTheme(raw: unknown): Theme {
  const r = (raw ?? {}) as Partial<Theme>;
  const palette = { ...DEFAULT_THEME.palette };
  for (const k of Object.keys(palette) as (keyof Palette)[]) {
    const v = r.palette?.[k];
    if (typeof v === "string" && HEX.test(v)) palette[k] = v;
  }
  const pick = <K extends keyof Theme>(k: K): Theme[K] => {
    const one = ThemeSchema.shape[k].safeParse(r[k]);
    return one.success ? (one.data as Theme[K]) : DEFAULT_THEME[k];
  };
  return {
    palette,
    displayFont: pick("displayFont"),
    bodyFont: pick("bodyFont"),
    layout: pick("layout"),
    navStyle: pick("navStyle"),
    buttonStyle: pick("buttonStyle"),
    ornament: pick("ornament"),
  };
}

export function themeStyle(theme: Theme): React.CSSProperties {
  const p = theme.palette;
  return {
    "--s-bg": p.background,
    "--s-surface": p.surface,
    "--s-ink": p.ink,
    "--s-muted": p.muted,
    "--s-accent": p.accent,
    "--s-on-accent": readableOn(p.accent),
    "--s-display": DISPLAY_FONTS[theme.displayFont].css,
    "--s-body": BODY_FONTS[theme.bodyFont].css,
  } as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Contraste (WCAG)
// ---------------------------------------------------------------------------

function luminance(hexColor: string) {
  const n = parseInt(hexColor.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Texto legível sobre uma cor de fundo. */
export function readableOn(bg: string) {
  return contrastRatio(bg, "#FFFFFF") >= contrastRatio(bg, "#1A1A1A") ? "#FFFFFF" : "#1A1A1A";
}

/** Avisos de contraste para o editor (texto normal pede 4,5:1). */
export function contrastWarnings(p: Palette) {
  const out: string[] = [];
  if (contrastRatio(p.ink, p.background) < 4.5) out.push("O texto principal tem pouco contraste com o fundo.");
  if (contrastRatio(p.muted, p.background) < 4.5) out.push("O texto secundário tem pouco contraste com o fundo.");
  if (contrastRatio(p.ink, p.surface) < 4.5) out.push("O texto tem pouco contraste com os blocos.");
  return out;
}
