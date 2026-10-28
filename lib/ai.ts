import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { SiteDesign } from "./design";
import { SECTIONS, SECTION_IDS } from "./sections";
import { BODY_FONTS, BUTTON_STYLES, DISPLAY_FONTS, HEX, LAYOUTS, NAV_STYLES, ORNAMENTS, keysOf, parseTheme } from "./theme";
import { LOCKABLE, LockKey, Proposal, StudioReply } from "./studio";

const MODEL = "claude-opus-5-5";
// Se a IA recusar por política, a API refaz o pedido no modelo de reserva recomendado.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

export const isAiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export class AiRefusalError extends Error {}

// ---------------------------------------------------------------------------
// Estúdio criativo
// ---------------------------------------------------------------------------

// Cores como texto livre; o formato #RRGGBB é validado depois por parseTheme.
const ThemeOut = z.object({
  palette: z.object({
    background: z.string().describe("Fundo da página, #RRGGBB"),
    surface: z.string().describe("Fundo de blocos e cartões, #RRGGBB"),
    ink: z.string().describe("Texto principal, #RRGGBB, contraste mínimo 7:1 com background"),
    muted: z.string().describe("Texto secundário, #RRGGBB, contraste mínimo 4.5:1 com background"),
    accent: z.string().describe("Destaques e botões, #RRGGBB"),
  }),
  displayFont: z.enum(keysOf(DISPLAY_FONTS)),
  bodyFont: z.enum(keysOf(BODY_FONTS)),
  layout: z.enum(keysOf(LAYOUTS)),
  navStyle: z.enum(keysOf(NAV_STYLES)),
  buttonStyle: z.enum(keysOf(BUTTON_STYLES)),
  ornament: z.enum(keysOf(ORNAMENTS)),
});

const ProposalOut = z.object({
  label: z.string().describe("Nome curto da proposta, ex.: 'Botânico editorial'"),
  summary: z.string().describe("2 a 3 frases: o que mudou e de qual referência veio cada escolha"),
  theme: ThemeOut,
  sectionOrder: z
    .array(z.enum(SECTION_IDS as [string, ...string[]]))
    .nullable()
    .describe("Nova ordem das seções se a composição mudar; null para manter"),
  inviteLine: z.string().describe("Frase curta acima dos nomes; string vazia para manter"),
  tagline: z.string().describe("Frase de abertura do site; string vazia para manter"),
  story: z.string().describe("Texto da história do casal; string vazia para manter"),
  thankYou: z.string().describe("Mensagem de agradecimento pós-casamento; string vazia para manter"),
});

const StudioOut = z.object({
  reply: z.string().describe("Resposta curta para os noivos, em 1 a 3 frases"),
  proposals: z.array(ProposalOut).describe("Exatamente 2 propostas: a principal e uma alternativa para comparar"),
});

export type StudioReference =
  | { kind: "image"; note: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string }
  | { kind: "url"; note: string; url: string };

export type StudioInput = {
  request: string;
  couple: { partnerOne: string; partnerTwo: string; date: string; venue: string; city: string; style: string };
  design: SiteDesign;
  locks: LockKey[];
  history: { role: "user" | "assistant"; content: string }[];
  references: StudioReference[];
};

const STUDIO_SYSTEM = `Você é o estúdio criativo da Eterna, uma plataforma brasileira de sites de casamento.
Os noivos descrevem o que querem e enviam imagens de referência (convites, flores, decoração, paletas, vestidos, outros sites).
Você transforma o pedido e as referências num sistema visual consistente e o aplica ao site inteiro: capa, convite, programação, RSVP e todas as outras seções usam o mesmo tema.

Como trabalhar:
- Responda sempre em português do Brasil, com tom caloroso e elegante, sem clichês nem exageros.
- As referências são numeradas na ordem em que aparecem. Quando pedirem "o convite da 1, o menu da 2 e as cores da 3", siga exatamente essa combinação.
- Parta do design atual e mude só o que o pedido ou as referências justificam. Pedidos pontuais ("troque as flores por folhagens") mudam só aquele aspecto.
- Respeite os elementos travados pelos noivos: não altere o que estiver na lista de travados.
- Sempre entregue duas propostas: a principal, fiel ao pedido, e uma alternativa coerente que explore outra direção para comparação.
- Garanta contraste legível (ink sobre background no mínimo 7:1; muted no mínimo 4.5:1).
- Use apenas as opções do esquema para fontes, layout, menu, botões e ornamentos.
- Não invente fatos sobre o casal. Só reescreva textos se o pedido envolver textos; caso contrário, devolva string vazia neles.

Seções disponíveis (ids): ${SECTION_IDS.map((id) => `${id} = ${SECTIONS[id].label}`).join("; ")}.`;

export async function generateStudioReply(input: StudioInput): Promise<StudioReply> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  input.references.forEach((ref, i) => {
    content.push({ type: "text", text: `Referência ${i + 1}${ref.note ? ` (nota dos noivos: ${ref.note})` : ""}` });
    content.push(
      ref.kind === "image"
        ? { type: "image", source: { type: "base64", media_type: ref.mediaType, data: ref.base64 } }
        : { type: "image", source: { type: "url", url: ref.url } },
    );
  });
  const locked = input.locks.map((k) => LOCKABLE[k]).join(", ") || "nenhum";
  content.push({
    type: "text",
    text: [
      `Casal: ${input.couple.partnerOne} e ${input.couple.partnerTwo}`,
      `Data: ${input.couple.date || "não informada"} · Local: ${[input.couple.venue, input.couple.city].filter(Boolean).join(", ") || "não informado"}`,
      input.couple.style && `Estilo descrito no cadastro: ${input.couple.style}`,
      `Design atual (JSON):\n${JSON.stringify(input.design)}`,
      `Elementos travados: ${locked}`,
      input.history.length &&
        `Conversa anterior:\n${input.history.map((m) => `${m.role === "user" ? "Noivos" : "Estúdio"}: ${m.content}`).join("\n")}`,
      `Pedido agora:\n${input.request}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: STUDIO_SYSTEM,
    output_config: { effort: "medium", format: betaZodOutputFormat(StudioOut) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new AiRefusalError("O estúdio não conseguiu atender a esse pedido. Tente descrever de outro jeito.");
  const out = response.parsed_output;
  if (!out) throw new Error("resposta incompleta");

  const current = input.design.theme;
  const proposals: Proposal[] = out.proposals.slice(0, 3).map((p) => ({
    label: p.label,
    summary: p.summary,
    theme: parseTheme({
      ...p.theme,
      palette: Object.fromEntries(
        Object.entries(p.theme.palette).map(([k, v]) => [k, HEX.test(v) ? v : current.palette[k as keyof typeof current.palette]]),
      ),
    }),
    sectionOrder: (p.sectionOrder as Proposal["sectionOrder"]) ?? null,
    content: { inviteLine: p.inviteLine, tagline: p.tagline, story: p.story, thankYou: p.thankYou },
  }));
  return { reply: out.reply, proposals, simulated: false };
}

// ---------------------------------------------------------------------------
// Construir Juntos: sugestão de capítulo e alerta de conteúdo sensível
// ---------------------------------------------------------------------------

const ClassifyOut = z.object({
  chapterId: z.string().describe("id do capítulo mais adequado, ou string vazia se nenhum servir"),
  note: z.string().describe("Uma frase curta para os noivos: por que esse capítulo, ou o motivo do alerta"),
  sensitive: z.boolean().describe("true se publicar para todos os convidados puder constranger o casal ou alguém"),
});

export async function classifyContribution(input: {
  chapters: { id: string; title: string }[];
  kind: string;
  author: string;
  relation: string;
  title: string;
  body: string;
}): Promise<{ chapterId: string | null; note: string }> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    ...FALLBACK,
    system:
      "Você ajuda noivos a organizar lembranças enviadas por convidados num livro de memórias. Responda em português do Brasil. Você nunca publica nada: só sugere o capítulo e sinaliza riscos.",
    output_config: { effort: "low", format: betaZodOutputFormat(ClassifyOut) },
    messages: [
      {
        role: "user",
        content: `Capítulos (JSON): ${JSON.stringify(input.chapters)}\n\nTipo: ${input.kind}\nAutor: ${input.author} (${input.relation || "relação não informada"})\nTítulo: ${input.title || "(sem título)"}\nTexto:\n${input.body || "(só foto)"}`,
      },
    ],
  });
  const out = response.stop_reason === "refusal" ? null : response.parsed_output;
  if (!out) return { chapterId: null, note: "" };
  const chapterId = input.chapters.some((c) => c.id === out.chapterId) ? out.chapterId : null;
  return { chapterId, note: (out.sensitive ? `Atenção: ${out.note}` : out.note).slice(0, 300) };
}
