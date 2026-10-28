import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DESIGN } from "@/lib/design";

// Integração com a IA (formato OpenAI) usando um provedor simulado: nenhuma chamada sai da máquina.

const proposal = (accent: string) => ({
  label: "Botânico",
  summary: "Folhagens finas e verde sálvia.",
  theme: {
    palette: { background: "#FBF8F2", surface: "#F0EEE4", ink: "#22201C", muted: "#625D52", accent },
    displayFont: "bodoni",
    bodyFont: "instrument",
    layout: "editorial",
    navStyle: "center",
    buttonStyle: "solid",
    ornament: "foliage",
  },
  sectionOrder: ["story", "timeline", "inexistente"],
  inviteLine: "",
  tagline: "",
  story: "",
  thankYou: "",
});

const reply = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { "Content-Type": "application/json" } });

const input = {
  request: "Quero folhagens",
  couple: { partnerOne: "A", partnerTwo: "B", date: "", venue: "", city: "", style: "" },
  design: DEFAULT_DESIGN,
  locks: [],
  history: [],
  references: [],
};

describe("IA compatível com OpenAI", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "chave-de-teste");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("chama chat/completions do Gemini e valida a resposta", async () => {
    fetchMock.mockResolvedValueOnce(reply(JSON.stringify({ reply: "Pronto.", proposals: [proposal("#6F8B70"), proposal("cor-invalida")] })));
    const { generateStudioReply } = await import("@/lib/ai");
    const out = await generateStudioReply(input);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer chave-de-teste");
    expect(JSON.parse(init.body).model).toBe("gemini-3.1-flash-lite");
    expect(JSON.parse(init.body).reasoning_effort).toBe("none");

    expect(out.simulated).toBe(false);
    expect(out.proposals[0].theme.palette.accent).toBe("#6F8B70");
    // Cor inválida da IA cai na cor atual; seção desconhecida é descartada.
    expect(out.proposals[1].theme.palette.accent).toBe(DEFAULT_DESIGN.theme.palette.accent);
    expect(out.proposals[0].sectionOrder).toEqual(["story", "timeline"]);
  });

  it("aceita JSON dentro de bloco de código e tenta de novo quando vem fora do esquema", async () => {
    fetchMock
      .mockResolvedValueOnce(reply("Aqui está: {\"reply\": 1}"))
      .mockResolvedValueOnce(reply("```json\n" + JSON.stringify({ reply: "Ok.", proposals: [proposal("#6F8B70")] }) + "\n```"));
    const { generateStudioReply } = await import("@/lib/ai");
    const out = await generateStudioReply(input);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.reply).toBe("Ok.");
    const retry = JSON.parse(fetchMock.mock.calls[1][1].body).messages.at(-1).content;
    expect(retry).toContain("não seguiu o esquema");
  });

  it("tenta de novo no mesmo modelo e depois usa o reserva quando o principal está sobrecarregado", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(reply(JSON.stringify({ reply: "Ok.", proposals: [proposal("#6F8B70")] })));
    const { generateStudioReply } = await import("@/lib/ai");
    const out = await generateStudioReply(input);
    expect(out.reply).toBe("Ok.");
    const models = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).model);
    expect(models).toEqual(["gemini-3.1-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-latest"]);
  });

  it("explica quando o limite gratuito acaba em todos os modelos", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 429 }));
    const { generateStudioReply, AiError } = await import("@/lib/ai");
    const err = await generateStudioReply(input).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.message).toContain("limite gratuito");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("não troca de modelo quando a chave é recusada", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 401 }));
    const { generateStudioReply } = await import("@/lib/ai");
    await expect(generateStudioReply(input)).rejects.toThrow("chave da IA foi recusada");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("não baixa imagens de links que apontam para a rede interna", async () => {
    fetchMock.mockResolvedValueOnce(reply(JSON.stringify({ reply: "Ok.", proposals: [proposal("#6F8B70")] })));
    const { generateStudioReply } = await import("@/lib/ai");
    await generateStudioReply({ ...input, references: [{ kind: "url", note: "", url: "https://127.0.0.1/segredo.png" }] });
    expect(fetchMock).toHaveBeenCalledTimes(1); // só a chamada da IA, nenhuma ao 127.0.0.1
    const parts = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    expect(parts[0].text).toContain("não pôde ser lido");
  });

  it("classificação de contribuição só aceita capítulos existentes", async () => {
    fetchMock.mockResolvedValueOnce(reply(JSON.stringify({ chapterId: "outro-id", note: "Pode constranger.", sensitive: true })));
    const { classifyContribution } = await import("@/lib/ai");
    const out = await classifyContribution({ chapters: [{ id: "c1", title: "O encontro" }], kind: "memory", author: "X", relation: "", title: "", body: "Oi" });
    expect(out).toEqual({ chapterId: null, note: "Atenção: Pode constranger." });
  });
});
