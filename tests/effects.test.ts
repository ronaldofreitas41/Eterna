import { describe, expect, it } from "vitest";
import { applyProposal } from "@/lib/studio";
import { parseDesign } from "@/lib/design";
import { DEFAULT_THEME, parseTheme, splineEmbed } from "@/lib/theme";

describe("efeitos 3D da capa", () => {
  it("sites salvos antes dos efeitos continuam sem efeito", () => {
    const { effect, splineUrl, ...old } = DEFAULT_THEME;
    expect(parseTheme(old)).toMatchObject({ effect: "none", splineUrl: "" });
    expect(parseTheme({ ...old, effect: "fogos" }).effect).toBe("none");
    expect(parseTheme({ ...old, effect, splineUrl }).effect).toBe("none");
    expect(parseTheme({ ...old, effect: "petals" }).effect).toBe("petals");
  });

  it("só aceita cenas publicadas do Spline", () => {
    expect(splineEmbed("https://my.spline.design/aliancas-abc123/")).toBe("https://my.spline.design/aliancas-abc123/");
    expect(splineEmbed("http://my.spline.design/x")).toBeNull();
    expect(splineEmbed("https://my.spline.design/")).toBeNull();
    expect(splineEmbed("https://evil.example/my.spline.design")).toBeNull();
    expect(splineEmbed("javascript:alert(1)")).toBeNull();
  });

  it("o estúdio nunca troca o link do Spline dos noivos", () => {
    const design = parseDesign({ theme: { ...DEFAULT_THEME, effect: "spline", splineUrl: "https://my.spline.design/nossa-cena" } });
    const next = applyProposal(
      design,
      { label: "x", summary: "", theme: { ...DEFAULT_THEME, effect: "petals", splineUrl: "https://my.spline.design/outra" }, sectionOrder: null, content: {} },
      new Set(),
    );
    expect(next.theme.effect).toBe("petals");
    expect(next.theme.splineUrl).toBe("https://my.spline.design/nossa-cena");
  });
});
