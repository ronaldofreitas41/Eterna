import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Testes de integração contra o banco real (DATABASE_URL). Criam dois casais e um visitante,
// exercitam as ações do servidor e apagam tudo no final (contas de teste em @eterna.test).

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined),
    set: (k: string, v: string) => void jar.set(k, v),
    delete: (k: string) => void jar.delete(k),
  }),
  headers: async () => new Headers({ host: "localhost:3000" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${to}` });
  },
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  },
  unstable_rethrow: (err: { digest?: string }) => {
    if (err?.digest?.startsWith("NEXT_")) throw err;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("integração com o PostgreSQL", async () => {
  const { query, one } = await import("@/lib/db");
  const { signUp } = await import("@/app/entrar/actions");
  const { createWeddingFromOnboarding } = await import("@/app/painel/actions");
  const guests = await import("@/app/painel/acoes/convidados");
  const juntos = await import("@/app/painel/acoes/juntos");
  const design = await import("@/app/painel/acoes/design");
  const settings = await import("@/app/painel/acoes/configuracoes");
  const publicActions = await import("@/app/c/actions");
  const { loadPublicSite, capsuleSummary } = await import("@/lib/site");
  const { readFileIfAllowed } = await import("@/lib/files");
  const { DEFAULT_DESIGN } = await import("@/lib/design");

  const tag = Math.random().toString(36).slice(2, 8);
  const sessions: Record<"a" | "b", string> = { a: "", b: "" };
  let weddingA = "";
  let slugA = "";
  const as = (who: "a" | "b" | "anon") => {
    jar.clear();
    if (who !== "anon") jar.set("eterna_sessao", sessions[who]);
  };

  async function signup(who: "a" | "b") {
    jar.clear();
    const form = new FormData();
    form.set("email", `teste-${who}-${tag}@eterna.test`);
    form.set("password", "senha-de-teste-123");
    await expect(signUp({}, form)).rejects.toMatchObject({ digest: "NEXT_REDIRECT;/painel/novo" });
    sessions[who] = jar.get("eterna_sessao")!;
    expect(sessions[who]).toBeTruthy();
  }

  beforeAll(async () => {
    await signup("a");
    await signup("b");
    as("a");
    const res = await createWeddingFromOnboarding({
      partnerOne: "Teste",
      partnerTwo: `Integração ${tag}`,
      date: "2030-01-01",
      city: "",
      venue: "",
      presetId: "botanico",
      style: "",
      palette: null,
      phaseMode: "auto",
      acceptingContributions: true,
      openRsvp: true,
      capsuleDate: "2031-01-01",
      features: ["rsvp", "together", "gallery", "guestbook", "capsule"],
    });
    expect(res.error).toBeUndefined();
    weddingA = res.id!;
    slugA = (await one<{ slug: string }>("select slug from weddings where id = $1", [weddingA]))!.slug;
  });

  afterAll(async () => {
    await query("delete from users where email like $1", [`teste-%-${tag}@eterna.test`]);
  });

  it("casal B não lê nem altera o casamento do casal A", async () => {
    as("b");
    const r1 = await guests.createGroup(weddingA, { name: "Intruso", max_party_size: 2, sees_logistics: true, message: "" });
    expect(r1).toEqual({ ok: false, error: "Casamento não encontrado." });
    const r2 = await settings.updateSettings(weddingA, { partner_one: "Hacker" });
    expect(r2.ok).toBe(false);
    const r3 = await design.publishSite(weddingA, DEFAULT_DESIGN);
    expect(r3.ok).toBe(false);
    expect((await one<{ partner_one: string; published: boolean }>("select partner_one, published from weddings where id = $1", [weddingA]))).toEqual({
      partner_one: "Teste",
      published: false,
    });
  });

  it("visitante sem sessão não usa ações do painel", async () => {
    as("anon");
    expect(await guests.createGuest(weddingA, { name: "x", contact: "", group_id: null })).toEqual({
      ok: false,
      error: "Sua sessão expirou. Entrem de novo.",
    });
  });

  it("site não publicado fica invisível; publicado aparece", async () => {
    expect(await loadPublicSite(slugA, null)).toBeNull();
    as("a");
    const pub = await design.publishSite(weddingA, DEFAULT_DESIGN);
    expect(pub.ok).toBe(true);
    expect((await loadPublicSite(slugA, null))?.wedding.id).toBe(weddingA);
  });

  it("convite respeita o limite do grupo e libera a logística só para o grupo autorizado", async () => {
    as("a");
    await query("update wedding_logistics set accommodation = 'Hotel secreto' where wedding_id = $1", [weddingA]);
    const g = await guests.createGroup(weddingA, { name: "Família", max_party_size: 2, sees_logistics: true, message: "Oi, família" });
    expect(g.ok).toBe(true);
    const guest = await guests.createGuest(weddingA, { name: "Tia", contact: "", group_id: g.ok ? g.data.id : null });
    expect(guest.ok).toBe(true);
    const token = guest.ok ? guest.data.invite_token : "";

    expect((await loadPublicSite(slugA, null))?.logistics).toBeNull();
    const site = await loadPublicSite(slugA, token);
    expect(site?.invitation?.group?.message).toBe("Oi, família");
    expect(site?.logistics?.accommodation).toBe("Hotel secreto");

    as("anon");
    const tooMany = await publicActions.submitInvitationRsvp({ weddingId: weddingA, token, attending: true, partySize: 5, companions: "", message: "" });
    expect(tooMany).toEqual({ ok: false, error: "Este convite permite até 2 pessoa(s)." });
    const okRsvp = await publicActions.submitInvitationRsvp({ weddingId: weddingA, token, attending: true, partySize: 2, companions: "Tio", message: "" });
    expect(okRsvp.ok).toBe(true);
  });

  it("contribuições exigem consentimento, respeitam o público da campanha e ficam privadas até a aprovação", async () => {
    as("anon");
    const campaign = await one<{ id: string }>("select id from campaigns where wedding_id = $1 and audience = 'invited' limit 1", [weddingA]);
    const form = (extra: Record<string, string>) => {
      const f = new FormData();
      f.set("weddingId", weddingA);
      f.set("name", "Visitante");
      f.set("body", "Uma lembrança");
      for (const [k, v] of Object.entries(extra)) f.set(k, v);
      return f;
    };
    expect((await publicActions.submitContribution(form({}))).ok).toBe(false); // sem consentimento
    expect(await publicActions.submitContribution(form({ consent: "on", campaignId: campaign!.id }))).toEqual({
      ok: false,
      error: "Esta campanha é só para convidados com convite individual.",
    });
    expect((await publicActions.submitContribution(form({ consent: "on" }))).ok).toBe(true);
    expect((await publicActions.submitContribution(form({ consent: "on", kind: "capsule", body: "Para daqui a um ano" }))).ok).toBe(true);

    const site = await loadPublicSite(slugA, null);
    expect(site?.guestbook).toHaveLength(0); // ainda pendente
    expect((await capsuleSummary({ id: weddingA, capsule_open_date: "2031-01-01" })).count).toBe(1);

    as("a");
    const pending = await one<{ id: string }>("select id from contributions where wedding_id = $1 and status = 'pending'", [weddingA]);
    expect((await juntos.moderateContribution(weddingA, pending!.id, { status: "published" })).ok).toBe(true);
    expect((await loadPublicSite(slugA, null))?.guestbook).toHaveLength(1);

    // A cápsula não pode ser moderada (nem lida) antes da data.
    const capsule = await one<{ id: string }>("select id from contributions where wedding_id = $1 and status = 'capsule'", [weddingA]);
    expect((await juntos.moderateContribution(weddingA, capsule!.id, { status: "published" })).ok).toBe(false);
  });

  it("fotos: só aparecem para o público depois de aprovadas", async () => {
    as("anon");
    // PNG de 1x1 pixel.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==", "base64");
    const f = new FormData();
    f.set("weddingId", weddingA);
    f.set("consent", "on");
    f.append("files", new File([png], "foto.png", { type: "image/png" }));
    expect((await publicActions.uploadGalleryPhotos(f)).ok).toBe(true);

    const fake = new FormData();
    fake.set("weddingId", weddingA);
    fake.set("consent", "on");
    fake.append("files", new File([Buffer.from("<script>alert(1)</script>")], "x.png", { type: "image/png" }));
    expect(await publicActions.uploadGalleryPhotos(fake)).toEqual({ ok: false, error: "Envie uma imagem JPG, PNG, WEBP ou GIF." });

    const photo = await one<{ id: string; file_id: string }>("select id, file_id from photos where wedding_id = $1", [weddingA]);
    expect(await readFileIfAllowed(photo!.file_id)).toBeNull(); // pendente: visitante não vê
    as("b");
    expect(await readFileIfAllowed(photo!.file_id)).toBeNull(); // outro casal também não
    as("a");
    expect(await readFileIfAllowed(photo!.file_id)).not.toBeNull(); // dono vê
    await query("update photos set status = 'approved' where id = $1", [photo!.id]);
    as("anon");
    expect((await readFileIfAllowed(photo!.file_id))?.mime).toBe("image/png");
  });
});
