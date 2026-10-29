import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import type { SiteDesign } from "./design";
import { SECTIONS, SECTION_IDS } from "./sections";
import { BODY_FONTS, BUTTON_STYLES, DISPLAY_FONTS, HEX, LAYOUTS, NAV_STYLES, ORNAMENTS, keysOf, parseTheme } from "./theme";
import { LOCKABLE, LockKey, Proposal, StudioReply } from "./studio";

// IA por qualquer API compatível com o formato da OpenAI (chat/completions).
// Padrão: Google Gemini no plano gratuito. Para trocar de fornecedor, mudem AI_BASE_URL e AI_MODEL:
//   Gemini:     https://generativelanguage.googleapis.com/v1beta/openai/   gemini-3.1-flash-lite
//   Groq:       https://api.groq.com/openai/v1/                           meta-llama/llama-4-scout-17b-16e-instruct
//   OpenRouter: https://openrouter.ai/api/v1/                             (modelos com sufixo :free)
//
// Se o modelo principal estiver sobrecarregado, sem cota gratuita no momento ou indisponível,
// tentamos os modelos de AI_FALLBACK_MODELS (separados por vírgula), em ordem.

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const BASE_URL = process.env.AI_BASE_URL || GEMINI_URL;
const isGemini = BASE_URL === GEMINI_URL;
const MODELS = [
  process.env.AI_MODEL || (isGemini ? "gemini-3.1-flash-lite" : ""),
  ...(process.env.AI_FALLBACK_MODELS ?? (isGemini && !process.env.AI_MODEL ? "gemini-flash-latest" : "")).split(","),
]
  .map((m) => m.trim())
  .filter(Boolean);
// Status que valem tentar outro modelo: cota esgotada, sobrecarga, erro do servidor, modelo retirado.
const RETRY_WITH_FALLBACK = new Set([404, 429, 500, 502, 503, 504]);

export const isAiConfigured = () => Boolean(process.env.AI_API_KEY);
/** Desliguem (AI_CLASSIFY_CONTRIBUTIONS=false) para não enviar textos de convidados a um serviço externo. */
export const isContributionAiEnabled = () => isAiConfigured() && process.env.AI_CLASSIFY_CONTRIBUTIONS !== "false";

/** Erro com mensagem que pode ser mostrada aos noivos. */
export class AiError extends Error {}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type Message = { role: "system" | "user" | "assistant"; content: string | Part[] };

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
}

/** Uma chamada a chat/completions, passando para o próximo modelo quando o atual não pode atender. */
async function complete(messages: Message[], timeoutMs: number) {
  if (!MODELS.length) throw new AiError("Definam AI_MODEL no .env.local para este provedor de IA.");
  let lastStatus = 0;
  // Sobrecarga (503) costuma passar em segundos: o mesmo modelo ganha uma segunda chance antes da troca.
  const attempts = MODELS.flatMap((m) => [m, m]);
  for (const [i, model] of attempts.entries()) {
    if (i % 2 === 1 && lastStatus !== 503) continue;
    if (i % 2 === 1) await new Promise((r) => setTimeout(r, 1500));
    let res: Response;
    try {
      res = await fetch(new URL("chat/completions", BASE_URL), {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7,
          // No Gemini, o raciocínio estendido deixa a resposta lenta demais para uma tela de edição.
          ...(isGemini ? { reasoning_effort: "none" } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if ((err as Error).name === "TimeoutError") {
        lastStatus = 504;
        continue;
      }
      throw err;
    }
    if (res.ok) return res.json();
    if (res.status === 401 || res.status === 403) throw new AiError("A chave da IA foi recusada. Confiram AI_API_KEY no .env.local.");
    lastStatus = res.status;
    console.warn(`[ia] ${model} respondeu ${res.status}`, (await res.text().catch(() => "")).slice(0, 300));
    if (!RETRY_WITH_FALLBACK.has(res.status)) break;
  }
  if (lastStatus === 429) throw new AiError("O limite gratuito da IA foi atingido por agora. Tentem de novo em alguns minutos.");
  if (lastStatus === 504) throw new AiError("A IA demorou demais para responder. Tentem de novo.");
  throw new AiError("A IA está indisponível agora. Tentem de novo em instantes.");
}

/**
 * Pede uma resposta em JSON e valida com o esquema Zod. Se vier fora do formato,
 * devolve os erros ao modelo e tenta mais uma vez.
 */
async function chatJson<T>(schema: z.ZodType<T>, system: string, user: string | Part[], timeoutMs: number): Promise<T> {
  const messages: Message[] = [
    {
      role: "system",
      content: `${system}\n\nResponda SOMENTE com um objeto JSON válido, sem texto antes ou depois, seguindo este JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`,
    },
    { role: "user", content: user },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const body = await complete(messages, timeoutMs);
    const content: string = body?.choices?.[0]?.message?.content ?? "";
    let data: unknown;
    try {
      data = extractJson(content);
    } catch {
      data = undefined;
    }
    const parsed = schema.safeParse(data);
    if (parsed.success) return parsed.data;

    const problems = parsed.error ? parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : "não é JSON";
    messages.push({ role: "assistant", content }, { role: "user", content: `A resposta não seguiu o esquema (${problems}). Responda de novo, só com o JSON corrigido.` });
  }
  throw new AiError("A IA devolveu uma resposta fora do formato esperado. Tentem de novo.");
}

// ---------------------------------------------------------------------------
// Imagens de referência por link: baixadas no servidor com proteção contra acesso à rede interna
// ---------------------------------------------------------------------------

const PRIVATE = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^f[cd]/i, /^fe80/i, /^::ffff:/i];
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function fetchRemoteImage(raw: string): Promise<string | null> {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addresses.length || addresses.some((a) => PRIVATE.some((re) => re.test(a.address)))) return null;
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000) });
    const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !IMAGE_MIME.includes(mime)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Estúdio criativo
// ---------------------------------------------------------------------------

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
    .array(z.string())
    .nullable()
    .describe(`Nova ordem das seções se a composição mudar (ids: ${SECTION_IDS.join(", ")}); null para manter`),
  inviteLine: z.string().describe("Frase curta acima dos nomes; string vazia para manter"),
  tagline: z.string().describe("Frase de abertura do site; string vazia para manter"),
  story: z.string().describe("Texto da história do casal; string vazia para manter"),
  thankYou: z.string().describe("Mensagem de agradecimento pós-casamento; string vazia para manter"),
});

const StudioOut = z.object({
  reply: z.string().describe("Resposta curta para os noivos, em 1 a 3 frases"),
  proposals: z.array(ProposalOut).min(1).describe("Exatamente 2 propostas: a principal e uma alternativa para comparar"),
});

export type StudioReference =
  | { kind: "image"; note: string; mediaType: string; base64: string }
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
- Escreva sempre em português do Brasil, com tom caloroso e elegante, sem clichês nem exageros.
- Nos textos para os noivos (reply e summary), use linguagem simples: não cite nomes de fontes, códigos de cor, nomes de layout nem termos técnicos. Diga, por exemplo, "uma letra caligráfica nos nomes" ou "um verde mais suave".
- As referências são numeradas na ordem em que aparecem. Quando pedirem "o convite da 1, o menu da 2 e as cores da 3", siga exatamente essa combinação.
- Parta do design atual e mude só o que o pedido ou as referências justificam. Pedidos pontuais ("troque as flores por folhagens") mudam só aquele aspecto.
- Respeite os elementos travados pelos noivos: não altere o que estiver na lista de travados.
- Sempre entregue duas propostas: a principal, fiel ao pedido, e uma alternativa coerente que explore outra direção para comparação.
- Garanta contraste legível (ink sobre background no mínimo 7:1; muted no mínimo 4.5:1).
- Use apenas as opções do esquema para fontes, layout, menu, botões e ornamentos. Cores sempre no formato #RRGGBB.
- Não invente fatos sobre o casal. Só reescreva textos se o pedido envolver textos; caso contrário, devolva string vazia neles.

Seções disponíveis (ids): ${SECTION_IDS.map((id) => `${id} = ${SECTIONS[id].label}`).join("; ")}.`;

export async function generateStudioReply(input: StudioInput): Promise<StudioReply> {
  const parts: Part[] = [];
  for (const [i, ref] of input.references.entries()) {
    const image = ref.kind === "image" ? `data:${ref.mediaType};base64,${ref.base64}` : await fetchRemoteImage(ref.url);
    const label = `Referência ${i + 1}${ref.note ? ` (nota dos noivos: ${ref.note})` : ""}`;
    if (image) parts.push({ type: "text", text: label }, { type: "image_url", image_url: { url: image } });
    else parts.push({ type: "text", text: `${label}: link que não pôde ser lido como imagem.` });
  }
  const locked = input.locks.map((k) => LOCKABLE[k]).join(", ") || "nenhum";
  parts.push({
    type: "text",
    text: [
      `Casal: ${input.couple.partnerOne} e ${input.couple.partnerTwo}`,
      `Data: ${input.couple.date || "não informada"} · Local: ${[input.couple.venue, input.couple.city].filter(Boolean).join(", ") || "não informado"}`,
      input.couple.style && `Estilo descrito no cadastro: ${input.couple.style}`,
      // A chave Pix dos noivos não vai para a IA: ela não precisa dela para mudar o design.
      `Design atual (JSON):\n${JSON.stringify({ ...input.design, content: { ...input.design.content, pix: undefined } })}`,
      `Elementos travados: ${locked}`,
      input.history.length &&
        `Conversa anterior:\n${input.history.map((m) => `${m.role === "user" ? "Noivos" : "Estúdio"}: ${m.content}`).join("\n")}`,
      `Pedido agora:\n${input.request}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const out = await chatJson(StudioOut, STUDIO_SYSTEM, parts, 60_000);
  const current = input.design.theme;
  const proposals: Proposal[] = out.proposals.slice(0, 3).map((p) => ({
    label: p.label,
    summary: p.summary,
    // Cores fora do formato ou opções inválidas caem no tema atual, campo a campo.
    theme: parseTheme({
      ...p.theme,
      palette: Object.fromEntries(
        Object.entries(p.theme.palette).map(([k, v]) => [k, HEX.test(v) ? v : current.palette[k as keyof typeof current.palette]]),
      ),
    }),
    sectionOrder: (p.sectionOrder?.filter((id) => id in SECTIONS) as Proposal["sectionOrder"]) ?? null,
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
  const out = await chatJson(
    ClassifyOut,
    "Você ajuda noivos a organizar lembranças enviadas por convidados num livro de memórias. Escreva em português do Brasil. Você nunca publica nada: só sugere o capítulo e sinaliza riscos.",
    `Capítulos (JSON): ${JSON.stringify(input.chapters)}\n\nTipo: ${input.kind}\nAutor: ${input.author} (${input.relation || "relação não informada"})\nTítulo: ${input.title || "(sem título)"}\nTexto:\n${input.body || "(só foto)"}`,
    45_000,
  );
  const chapterId = input.chapters.some((c) => c.id === out.chapterId) ? out.chapterId : null;
  return { chapterId, note: (out.sensitive ? `Atenção: ${out.note}` : out.note).slice(0, 300) };
}
