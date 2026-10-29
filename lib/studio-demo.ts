import type { SiteDesign } from "./design";
import { PRESETS } from "./presets";
import { LAYOUTS, Theme } from "./theme";
import type { SectionId } from "./sections";
import type { Proposal, ReferencePalette, StudioReply } from "./studio";

// Modo demonstrativo do estúdio: interpreta comandos comuns por palavras-chave e gera alterações reais no design.
// É usado quando a chave da IA não está configurada, e fica identificado como simulado na interface.

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const ACCENTS: { words: RegExp; accent: string; name: string }[] = [
  { words: /\b(salvia|verde)\b/, accent: "#6F8B70", name: "verde sálvia" },
  { words: /\b(rosa|blush|rose)\b/, accent: "#A8665C", name: "rosa antigo" },
  { words: /\b(azul|petroleo)\b/, accent: "#3D6F78", name: "azul petróleo" },
  { words: /\b(dourad|ouro|champanhe)/, accent: "#8C7356", name: "dourado envelhecido" },
  { words: /\b(terracota)\b/, accent: "#9A5B43", name: "terracota" },
  { words: /\b(preto|monocrom)/, accent: "#1C1C1A", name: "preto suave" },
];

const LAYOUT_CYCLE = Object.keys(LAYOUTS) as Theme["layout"][];

export function runDemoCommand(
  request: string,
  design: SiteDesign,
  referencePalettes: ReferencePalette[],
): StudioReply {
  const q = norm(request);
  let theme: Theme = structuredClone(design.theme);
  let sectionOrder: SectionId[] | null = null;
  const changes: string[] = [];
  let label = "Ajuste";

  const preset = PRESETS.find((p) => q.includes(norm(p.name).split(" ")[0]) || q.includes(p.id));
  if (preset) {
    theme = structuredClone(preset.theme);
    label = preset.name;
    changes.push(`apliquei o estilo ${preset.name.toLowerCase()}`);
  }

  if (/minimal/.test(q)) {
    theme = { ...theme, ornament: "line", layout: "editorial", navStyle: "split", buttonStyle: "outline", displayFont: "italiana" };
    label = "Mais minimalista";
    changes.push("tirei os ornamentos, deixei a tipografia mais fina e a composição alinhada à esquerda");
  }
  if (/classic/.test(q)) {
    theme = { ...theme, displayFont: "cormorant", bodyFont: "lora", layout: "centered", navStyle: "center", buttonStyle: "outline", ornament: "florals" };
    label = "Versão clássica";
    changes.push("usei serifas clássicas, composição centralizada e flores delicadas");
  }
  if (/romant/.test(q)) {
    theme = { ...theme, displayFont: "pinyon", bodyFont: "figtree", ornament: "florals", buttonStyle: "pill", navStyle: "pill" };
    theme.palette = { ...theme.palette, accent: "#A8665C", surface: "#F3E6E0" };
    label = "Mais romântico";
    changes.push("usei caligrafia nos nomes, flores delicadas e um rosa antigo nos detalhes");
  }
  if (/capa/.test(q) && /impact|destaque|marcante|forte/.test(q)) {
    theme = { ...theme, layout: "editorial", ornament: "none" };
    label = "Capa impactante";
    changes.push("deixei os nomes bem maiores, alinhados à esquerda, sem ornamentos disputando atenção");
  }
  if (/menos bege|sem bege/.test(q)) {
    theme.palette = { ...theme.palette, background: "#FBFCF9", surface: "#E8EFE6" };
    changes.push("troquei o bege por um branco esverdeado");
  }
  if (/folhage|folhas/.test(q)) {
    theme.ornament = "foliage";
    changes.push("troquei os ornamentos por folhagens");
  } else if (/\bflor/.test(q)) {
    theme.ornament = "florals";
    changes.push("usei flores delicadas como ornamento");
  }
  if (/marfim|off.?white/.test(q)) {
    theme.palette = { ...theme.palette, background: "#FBF8F2", surface: "#F2EDE3" };
    changes.push("deixei o fundo marfim");
  }
  for (const a of ACCENTS) {
    if (a.words.test(q)) {
      theme.palette = { ...theme.palette, accent: a.accent };
      changes.push(`usei ${a.name} nos detalhes`);
      break;
    }
  }

  const refMatch = q.match(/cores d[aeo]s?\s*(?:referencia\s*|imagem\s*|ref\.?\s*)?(\d+)/) ?? (/cores desta imagem|cores da imagem/.test(q) ? ["", "1"] : null);
  if (refMatch) {
    const n = Number(refMatch[1]);
    const ref = referencePalettes.find((r) => r.index === n);
    if (ref) {
      theme.palette = ref.palette;
      changes.push(`extraí as cores da referência ${n}`);
    } else {
      changes.push(`não consegui ler as cores da referência ${n} (envie a imagem pelo dispositivo para eu analisar)`);
    }
  }

  if (/composicao|layout|disposicao/.test(q)) {
    theme.layout = LAYOUT_CYCLE[(LAYOUT_CYCLE.indexOf(theme.layout) + 1) % LAYOUT_CYCLE.length];
    sectionOrder = ["story", "timeline", "schedule", "ceremony", "location", "rsvp"];
    changes.push(`mudei a composição para "${LAYOUTS[theme.layout].toLowerCase()}" e reordenei as seções principais`);
  }
  if (/linha do tempo/.test(q)) {
    sectionOrder = ["countdown", "story", "timeline", ...(sectionOrder ?? []).filter((s) => s !== "story" && s !== "timeline")];
    changes.push("coloquei a linha do tempo logo depois da história");
  }
  if (/mantenha a tipografia|manter a tipografia|mesma tipografia/.test(q)) {
    theme = { ...theme, displayFont: design.theme.displayFont, bodyFont: design.theme.bodyFont };
    changes.push("mantive a tipografia atual");
  }
  if (/convite|programa/.test(q) && /aplique|aplica|use/.test(q)) {
    changes.push("a identidade já vale para o convite, a programação e todas as outras seções");
  }

  if (!changes.length)
    return {
      simulated: true,
      proposals: [],
      reply:
        "Na demonstração eu entendo pedidos como: “deixe o site mais minimalista”, “quero mais verde e menos bege”, “troque as flores por folhagens”, “deixe a página mais romântica”, “quero uma capa mais impactante” ou “volte para a versão anterior”. Com o assistente de criação configurado, vocês podem pedir com as próprias palavras.",
    };

  const primary: Proposal = { label, summary: capitalize(changes.join("; ")) + ".", theme, sectionOrder, content: {} };
  const alternative: Proposal = {
    label: `${label} · variação`,
    summary: "Mesma direção com outra composição e outro estilo de botão, para comparar.",
    theme: {
      ...theme,
      layout: LAYOUT_CYCLE[(LAYOUT_CYCLE.indexOf(theme.layout) + 1) % LAYOUT_CYCLE.length],
      buttonStyle: theme.buttonStyle === "pill" ? "solid" : "pill",
      ornament: theme.ornament === "none" ? "line" : theme.ornament,
    },
    sectionOrder,
    content: {},
  };
  return { simulated: true, proposals: [primary, alternative], reply: "Preparei duas opções. Vejam como fica e usem a que preferirem." };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
