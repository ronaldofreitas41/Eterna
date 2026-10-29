"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import WeddingSite from "@/components/site/WeddingSite";
import ReferenceUploader, { type RefView } from "@/components/panel/ReferenceUploader";
import { generateFirstVersion, saveDream, type FirstVersion } from "../acoes/criar";
import { updateSettings } from "../acoes/configuracoes";
import { saveDraft } from "../acoes/design";
import { startWedding, type StartInput } from "../actions";
import { DEFAULT_DESIGN, type SiteDesign } from "@/lib/design";
import type { SiteData } from "@/lib/site";
import { applyProposal, type Proposal } from "@/lib/studio";

const STEPS = ["O casamento", "O sonho", "A primeira versão"] as const;

const IDEAS = [
  "Elegante e romântico, com verde-sálvia e flores brancas",
  "Minimalista, branco e preto suave, muito espaço",
  "Clássico, marfim e dourado envelhecido",
  "Ao ar livre, folhagens e tons terrosos",
  "Praia ao entardecer, areia e azul petróleo",
  "Tipografia sofisticada e estética atemporal",
];

type Generated = FirstVersion & { index: number };

/** Criação já começada (a página foi recarregada no meio do caminho). */
export type Resume = { id: string; info: Omit<StartInput, "presetId" | "gifts">; dream: string; refs: RefView[] };

export default function Onboarding({ resume }: { resume?: Resume }) {
  const router = useRouter();
  const [step, setStep] = useState(resume ? 1 : 0);
  // O estilo nasce da descrição na etapa seguinte; o botânico (verde-sálvia) é só o ponto de partida.
  const [info, setInfo] = useState<StartInput>({
    ...(resume?.info ?? { partnerOne: "", partnerTwo: "", date: null, venue: "", city: "" }),
    presetId: "botanico",
    gifts: true,
  });
  const [dream, setDream] = useState(resume?.dream ?? "");
  const [weddingId, setWeddingId] = useState<string | null>(resume?.id ?? null);
  const [design, setDesign] = useState<SiteDesign>(DEFAULT_DESIGN);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [error, setError] = useState("");
  // Lista estável: o ReferenceUploader recomeça a partir dela sempre que ela muda.
  const [initialRefs] = useState<RefView[]>(resume?.refs ?? []);
  const [pending, start] = useTransition();
  const set = <K extends keyof StartInput>(k: K, v: StartInput[K]) => setInfo((d) => ({ ...d, [k]: v }));

  function goToDream() {
    if (!info.partnerOne.trim() || !info.partnerTwo.trim()) return setError("Escrevam o nome de vocês dois para continuar.");
    setError("");
    start(async () => {
      if (!weddingId) {
        const res = await startWedding(info);
        if (res.error || !res.id) return setError(res.error ?? "Não foi possível começar agora.");
        setWeddingId(res.id);
        // Guarda o casamento no endereço: recarregar a página continua daqui, sem criar outro.
        router.replace(`/painel/novo?casamento=${res.id}`, { scroll: false });
      } else {
        // Voltaram para corrigir os dados: salva o que mudou.
        const res = await updateSettings(weddingId, {
          partner_one: info.partnerOne,
          partner_two: info.partnerTwo,
          wedding_date: info.date,
          venue: info.venue,
          city: info.city,
        });
        if (!res.ok) return setError(res.error);
      }
      setStep(1);
    });
  }

  /** Mostra uma proposta na prévia e já salva como rascunho. */
  async function show(p: Proposal, base: SiteDesign) {
    const next = applyProposal(base, p, new Set());
    setDesign(next);
    setSeen((s) => [...new Set([...s, p.label])]);
    const saved = await saveDraft(weddingId!, next);
    if (!saved.ok) setError(saved.error);
  }

  function create() {
    setError("");
    start(async () => {
      const dreamRes = await saveDream(weddingId!, dream);
      if (!dreamRes.ok) return setError(dreamRes.error);
      const res = await generateFirstVersion(weddingId!);
      if (!res.ok) return setError(res.error);
      if (!res.data.proposals.length) return setError("Não conseguimos montar uma versão agora. Tentem de novo.");
      await show(res.data.proposals[0], res.data.base);
      setGenerated({ ...res.data, index: 0 });
      setStep(2);
    });
  }

  function anotherStyle() {
    if (!generated) return;
    setError("");
    start(async () => {
      // A segunda proposta já veio junto; depois dela, pedimos estilos novos.
      if (generated.index + 1 < generated.proposals.length) {
        await show(generated.proposals[generated.index + 1], generated.base);
        setGenerated({ ...generated, index: generated.index + 1 });
        return;
      }
      const res = await generateFirstVersion(weddingId!, seen);
      if (!res.ok) return setError(res.error);
      if (!res.data.proposals.length) return setError("Não há outro estilo disponível agora.");
      await show(res.data.proposals[0], res.data.base);
      setGenerated({ ...res.data, index: 0 });
    });
  }

  const current = generated?.proposals[generated.index];
  const preview: SiteData = {
    wedding: {
      id: weddingId ?? "novo",
      slug: "",
      partner_one: info.partnerOne,
      partner_two: info.partnerTwo,
      wedding_date: info.date,
      city: info.city,
      venue: info.venue,
      phase: "antes",
      live_notice: "",
      mission: "",
      capsule_open_date: null,
      accepting_contributions: false,
      open_rsvp: true,
      is_demo: false,
    },
    design,
    schedule: [],
    chapters: [],
    guestbook: [],
    photos: [],
    coverUrl: null,
    logistics: null,
    campaigns: [],
    capsule: null,
    invitation: null,
  };

  return (
    <section className={`onboarding${step === 2 ? " wide" : ""}`}>
      <ol className="steps" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : undefined}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="onb-card">
          <h1>Vamos começar pelo casamento de vocês</h1>
          <p className="lede">Só os nomes são obrigatórios. Todo o resto pode ser preenchido depois.</p>
          <div className="row2">
            <label className="field">
              <span>Seu nome</span>
              <input id="onb-p1" value={info.partnerOne} onChange={(e) => set("partnerOne", e.target.value)} maxLength={80} autoComplete="given-name" />
            </label>
            <label className="field">
              <span>Nome de quem casa com você</span>
              <input id="onb-p2" value={info.partnerTwo} onChange={(e) => set("partnerTwo", e.target.value)} maxLength={80} autoComplete="off" />
            </label>
          </div>
          <label className="field">
            <span>Data do casamento (se já tiverem)</span>
            <input id="onb-date" type="date" value={info.date ?? ""} onChange={(e) => set("date", e.target.value || null)} />
          </label>
          <div className="row2">
            <label className="field">
              <span>Local (opcional)</span>
              <input id="onb-venue" value={info.venue} onChange={(e) => set("venue", e.target.value)} maxLength={160} placeholder="Ex.: Fazenda das Oliveiras" />
            </label>
            <label className="field">
              <span>Cidade (opcional)</span>
              <input id="onb-city" value={info.city} onChange={(e) => set("city", e.target.value)} maxLength={120} placeholder="Ex.: Itu, SP" />
            </label>
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <div className="onb-actions">
            <span className="spacer" />
            <button type="button" className="btn primary large" onClick={goToDream} disabled={pending}>
              {pending ? "Um instante…" : "Continuar"}
            </button>
          </div>
        </div>
      )}

      {step === 1 && weddingId && (
        <div className="onb-card">
          <h1>Como vocês imaginam o casamento?</h1>
          <p className="lede">Escrevam com as palavras de vocês. Se quiserem, enviem imagens de convites, flores ou decorações de que gostam.</p>
          <label className="field">
            <span className="sr-only">Descrição do casamento</span>
            <textarea
              id="onb-dream"
              rows={4}
              maxLength={400}
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              placeholder="Quero um casamento elegante e romântico, com tons de verde-sálvia, flores brancas, tipografia sofisticada e uma estética atemporal."
            />
          </label>
          <div className="idea-chips" aria-label="Ideias para começar">
            <span className="mono">Sem ideias? Toquem para usar</span>
            {IDEAS.map((idea) => (
              <button key={idea} type="button" onClick={() => setDream((d) => (d ? `${d.replace(/[.\s]+$/, "")}. ${idea}.` : `${idea}.`).slice(0, 400))}>
                {idea}
              </button>
            ))}
          </div>
          <details className="onb-refs">
            <summary>Enviar imagens de referência (opcional)</summary>
            <ReferenceUploader weddingId={weddingId} initial={initialRefs} />
          </details>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <div className="onb-actions">
            <button type="button" className="btn ghost" onClick={() => setStep(0)} disabled={pending}>
              Voltar
            </button>
            <span className="spacer" />
            <button type="button" className="btn primary large" onClick={create} disabled={pending}>
              {pending ? "Criando a primeira versão…" : "Criar minha primeira versão"}
            </button>
          </div>
          {pending && <p className="muted small" role="status">Estamos montando cores, tipografia, capa e textos. Isso leva alguns segundos.</p>}
        </div>
      )}

      {step === 2 && weddingId && (
        <div className="first-version">
          <div className="fv-head">
            <div>
              <span className="mono">Primeira versão{current ? ` · ${current.label}` : ""}</span>
              <h1>Este é o começo do site de vocês</h1>
              <p className="lede">{generated?.message}</p>
              {generated?.simulated && (
                <p className="notice demo" role="note">
                  Versão de demonstração: o assistente de criação ainda não foi configurado, então usamos um estilo pronto.
                </p>
              )}
            </div>
            <div className="seg" role="group" aria-label="Ver como">
              <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
                Computador
              </button>
              <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
                Celular
              </button>
            </div>
          </div>
          <div className={`device device-${device} preview-scroll fv-preview`} tabIndex={0} aria-label="Prévia do site">
            <WeddingSite data={preview} phase="antes" mode="preview" today={new Date()} />
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <div className="fv-actions">
            <button type="button" className="btn primary large" onClick={() => router.push(`/painel/${weddingId}`)} disabled={pending}>
              Gostei, continuar
            </button>
            <button type="button" className="btn ghost large" onClick={() => router.push(`/painel/${weddingId}/site`)} disabled={pending}>
              Quero ajustar
            </button>
            <button type="button" className="text-link" onClick={anotherStyle} disabled={pending}>
              {pending ? "Preparando outro estilo…" : "Tentar outro estilo"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
