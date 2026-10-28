import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, parseDesign, safeUrl, formatBRL } from "@/lib/design";
import { daysBetween, resolvePhase } from "@/lib/phase";
import { PRESETS } from "@/lib/presets";
import { DEFAULT_SECTIONS, moveSection, normalizeSections, visibleSections } from "@/lib/sections";
import { applyProposal, type Proposal } from "@/lib/studio";
import { runDemoCommand } from "@/lib/studio-demo";
import { DEFAULT_THEME, contrastRatio, contrastWarnings, parseTheme, readableOn } from "@/lib/theme";

describe("fases do Casamento Vivo", () => {
  const today = new Date(2027, 4, 15, 14, 30);
  it("segue a data no modo automático", () => {
    expect(resolvePhase("auto", "2027-05-20", today)).toBe("antes");
    expect(resolvePhase("auto", "2027-05-15", today)).toBe("durante");
    expect(resolvePhase("auto", "2027-05-14", today)).toBe("depois");
  });
  it("sem data fica em 'antes'", () => {
    expect(resolvePhase("auto", null, today)).toBe("antes");
  });
  it("respeita a fase fixada pelos noivos", () => {
    expect(resolvePhase("depois", "2030-01-01", today)).toBe("depois");
  });
  it("conta dias sem depender do horário", () => {
    expect(daysBetween(new Date(2027, 4, 14, 23, 59), new Date(2027, 4, 15, 0, 1))).toBe(1);
  });
});

describe("tema", () => {
  it("descarta cores e opções inválidas campo a campo", () => {
    const t = parseTheme({ palette: { background: "red", accent: "#123456" }, layout: "inexistente", displayFont: "pinyon" });
    expect(t.palette.background).toBe(DEFAULT_THEME.palette.background);
    expect(t.palette.accent).toBe("#123456");
    expect(t.layout).toBe(DEFAULT_THEME.layout);
    expect(t.displayFont).toBe("pinyon");
  });
  it("calcula contraste WCAG", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(readableOn("#1C1C1A")).toBe("#FFFFFF");
    expect(readableOn("#FBF8F2")).toBe("#1A1A1A");
  });
  it("todos os estilos prontos têm texto legível", () => {
    for (const p of PRESETS) expect(contrastWarnings(p.theme.palette), p.name).toEqual([]);
  });
});

describe("seções", () => {
  it("normaliza listas salvas com ids desconhecidos ou repetidos", () => {
    const s = normalizeSections([{ id: "faq", enabled: false }, { id: "faq", enabled: true }, { id: "xyz", enabled: true }]);
    expect(s[0]).toEqual({ id: "faq", enabled: false });
    expect(s.filter((x) => x.id === "faq")).toHaveLength(1);
    expect(s).toHaveLength(DEFAULT_SECTIONS.length);
  });
  it("mostra só as seções da fase", () => {
    const antes = visibleSections(DEFAULT_SECTIONS, "antes");
    expect(antes).toContain("rsvp");
    expect(antes).not.toContain("gallery");
    expect(visibleSections(DEFAULT_SECTIONS, "depois")).toContain("thanks");
  });
  it("reordena sem sair dos limites", () => {
    const first = DEFAULT_SECTIONS[0].id;
    expect(moveSection(DEFAULT_SECTIONS, first, -1)).toBe(DEFAULT_SECTIONS);
    expect(moveSection(DEFAULT_SECTIONS, first, 1)[1].id).toBe(first);
  });
});

describe("design", () => {
  it("lê designs vazios ou corrompidos com valores padrão", () => {
    expect(parseDesign(null)).toEqual(DEFAULT_DESIGN);
    const d = parseDesign({ content: { story: 42, tagline: "Oi" } });
    expect(d.content.story).toBe("");
    expect(d.content.tagline).toBe("Oi");
  });
  it("só aceita links http(s)", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://exemplo.com/a")).toBe("https://exemplo.com/a");
  });
  it("formata reais", () => {
    expect(formatBRL(45000).replace(/\s/g, " ")).toBe("R$ 450,00");
  });
});

describe("estúdio", () => {
  const base = { ...DEFAULT_DESIGN, theme: PRESETS[0].theme };

  it("modo demonstrativo: 'mais minimalista' muda o design de verdade e oferece alternativa", () => {
    const r = runDemoCommand("Deixe o site mais minimalista", base, []);
    expect(r.simulated).toBe(true);
    expect(r.proposals).toHaveLength(2);
    expect(r.proposals[0].theme.ornament).toBe("line");
    expect(r.proposals[1].theme.layout).not.toBe(r.proposals[0].theme.layout);
  });
  it("modo demonstrativo: troca flores por folhagens", () => {
    const r = runDemoCommand("Troque as flores por folhagens", { ...base, theme: { ...base.theme, ornament: "florals" } }, []);
    expect(r.proposals[0].theme.ornament).toBe("foliage");
  });
  it("modo demonstrativo: usa as cores de uma referência", () => {
    const palette = { background: "#FFFFFF", surface: "#EEEEEE", ink: "#111111", muted: "#555555", accent: "#AA3355" };
    const r = runDemoCommand("Use as cores da referência 2", base, [{ index: 2, palette }]);
    expect(r.proposals[0].theme.palette).toEqual(palette);
  });
  it("modo demonstrativo: pedido sem comando conhecido não altera nada", () => {
    expect(runDemoCommand("Bom dia", base, []).proposals).toHaveLength(0);
  });
  it("respeita os elementos travados ao aplicar uma proposta", () => {
    const p: Proposal = {
      label: "Teste",
      summary: "",
      theme: { ...PRESETS[2].theme },
      sectionOrder: ["faq", "story"],
      content: { story: "Nova história" },
    };
    const out = applyProposal(base, p, new Set(["palette", "fonts", "composition", "texts"]));
    expect(out.theme.palette).toEqual(base.theme.palette);
    expect(out.theme.displayFont).toBe(base.theme.displayFont);
    expect(out.sections).toEqual(base.sections);
    expect(out.content.story).toBe(base.content.story);
    expect(out.theme.ornament).toBe(PRESETS[2].theme.ornament);

    const free = applyProposal(base, p, new Set());
    expect(free.sections[0].id).toBe("faq");
    expect(free.content.story).toBe("Nova história");
  });
});
