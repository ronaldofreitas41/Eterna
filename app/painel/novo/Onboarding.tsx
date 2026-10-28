"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PRESETS } from "@/lib/presets";
import { SECTIONS } from "@/lib/sections";
import type { Palette } from "@/lib/theme";
import { createWeddingFromOnboarding, type OnboardingInput } from "../actions";
import ReferenceUploader from "@/components/panel/ReferenceUploader";
import DemoButton from "../DemoButton";

const STEPS = ["O casal", "Estilo", "Paleta", "Convidados", "Funcionalidades", "Referências"] as const;

const FEATURES = [
  { id: "rsvp", hint: "Convidados confirmam pelo site ou pelo convite individual." },
  { id: "together", hint: "Campanhas para familiares e amigos contarem lembranças." },
  { id: "gallery", hint: "Fotos enviadas pelos convidados, com aprovação de vocês." },
  { id: "guestbook", hint: "Mensagens para vocês, moderadas antes de aparecer." },
  { id: "capsule", hint: "Mensagens lacradas até uma data futura." },
  { id: "gifts", hint: "Links para presentes, sem pagamento pela Eterna." },
  { id: "timeline", hint: "A história contada em momentos." },
  { id: "faq", hint: "Respostas para as dúvidas mais comuns." },
  { id: "logistics", hint: "Hospedagem e transporte, só para quem vocês autorizarem." },
] as const;

const initial: OnboardingInput = {
  partnerOne: "",
  partnerTwo: "",
  date: null,
  city: "",
  venue: "",
  presetId: "botanico",
  style: "",
  palette: null,
  phaseMode: "auto",
  acceptingContributions: true,
  openRsvp: true,
  capsuleDate: null,
  features: FEATURES.map((f) => f.id),
};

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof OnboardingInput>(k: K, v: OnboardingInput[K]) => setData((d) => ({ ...d, [k]: v }));

  const preset = PRESETS.find((p) => p.id === data.presetId) ?? PRESETS[0];
  const palette: Palette = data.palette ?? preset.theme.palette;

  function next() {
    if (step === 0 && (!data.partnerOne.trim() || !data.partnerTwo.trim())) return setError("Preencham o nome dos dois para continuar.");
    setError("");
    if (step === 4) {
      start(async () => {
        const res = await createWeddingFromOnboarding(data);
        if (res.error || !res.id) return setError(res.error ?? "Não foi possível criar o casamento.");
        setWeddingId(res.id);
        setStep(5);
      });
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <section className="onboarding">
      <ol className="steps" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : undefined}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <div className="onb-card">
        {step === 0 && (
          <>
            <h1>Vamos começar pelo casal</h1>
            <p className="lede">Só os nomes são obrigatórios. O resto vocês podem preencher depois.</p>
            <div className="row2">
              <label className="field">
                <span>Nome de quem casa</span>
                <input id="onb-p1" value={data.partnerOne} onChange={(e) => set("partnerOne", e.target.value)} maxLength={80} required autoComplete="off" />
              </label>
              <label className="field">
                <span>E de quem mais casa</span>
                <input id="onb-p2" value={data.partnerTwo} onChange={(e) => set("partnerTwo", e.target.value)} maxLength={80} required autoComplete="off" />
              </label>
            </div>
            <div className="row3">
              <label className="field">
                <span>Data (se já definida)</span>
                <input id="onb-date" type="date" value={data.date ?? ""} onChange={(e) => set("date", e.target.value || null)} />
              </label>
              <label className="field">
                <span>Cidade</span>
                <input id="onb-city" value={data.city} onChange={(e) => set("city", e.target.value)} maxLength={120} placeholder="Ex.: Itu, SP" />
              </label>
              <label className="field">
                <span>Local</span>
                <input id="onb-venue" value={data.venue} onChange={(e) => set("venue", e.target.value)} maxLength={160} />
              </label>
            </div>
            <div className="onb-alt">
              <span className="mono">Querem só explorar?</span>
              <DemoButton label="Criar um casamento de demonstração" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Qual é o estilo de vocês?</h1>
            <p className="lede">Escolham um ponto de partida. O estúdio criativo ajusta tudo depois.</p>
            <div className="preset-grid">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="preset"
                  aria-pressed={data.presetId === p.id}
                  onClick={() => setData((d) => ({ ...d, presetId: p.id, palette: null }))}
                >
                  <span className="preset-swatch" style={{ background: p.theme.palette.background }}>
                    {[p.theme.palette.ink, p.theme.palette.accent, p.theme.palette.surface].map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                  </span>
                  <strong>{p.name}</strong>
                  <span>{p.description}</span>
                </button>
              ))}
            </div>
            <label className="field">
              <span>Descrevam com suas palavras (opcional)</span>
              <textarea
                id="onb-style"
                rows={3}
                maxLength={400}
                value={data.style}
                onChange={(e) => set("style", e.target.value)}
                placeholder="Ex.: fundo marfim, verde sálvia, flores delicadas, algo sofisticado e emocional."
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Paleta de cores</h1>
            <p className="lede">Usamos as cores do estilo {preset.name.toLowerCase()}. Ajustem se quiserem.</p>
            <div className="palette-edit">
              {(Object.keys(palette) as (keyof Palette)[]).map((k) => (
                <label key={k} className="color-field">
                  <input id={`onb-color-${k}`} type="color" value={palette[k]} onChange={(e) => set("palette", { ...palette, [k]: e.target.value.toUpperCase() })} />
                  <span>{{ background: "Fundo", surface: "Blocos", ink: "Texto", muted: "Texto secundário", accent: "Destaque" }[k]}</span>
                </label>
              ))}
            </div>
            <div className="palette-sample" style={{ background: palette.background, color: palette.ink }}>
              <span style={{ color: palette.muted }}>Prévia</span>
              <strong>
                {data.partnerOne || "Helena"} &amp; {data.partnerTwo || "Rafael"}
              </strong>
              <span className="palette-btn" style={{ background: palette.accent }}>
                Confirmar presença
              </span>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Como os convidados vão viver o site</h1>
            <fieldset className="field">
              <legend>Fases do site</legend>
              <label className="radio">
                <input type="radio" name="phase" checked={data.phaseMode === "auto"} onChange={() => set("phaseMode", "auto")} />
                <span>Mudar sozinho pela data: antes, no dia e depois do casamento. Vocês podem corrigir quando quiserem.</span>
              </label>
              <label className="radio">
                <input type="radio" name="phase" checked={data.phaseMode === "antes"} onChange={() => set("phaseMode", "antes")} />
                <span>Prefiro mudar de fase manualmente.</span>
              </label>
            </fieldset>
            <label className="check">
              <input type="checkbox" checked={data.openRsvp} onChange={(e) => set("openRsvp", e.target.checked)} />
              <span>Qualquer pessoa com o link do site pode confirmar presença (além dos convites individuais).</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={data.acceptingContributions} onChange={(e) => set("acceptingContributions", e.target.checked)} />
              <span>Receber lembranças, fotos e mensagens dos convidados (tudo passa pela aprovação de vocês).</span>
            </label>
            <label className="field narrow">
              <span>Data de abertura da cápsula do tempo (opcional)</span>
              <input id="onb-capsule" type="date" value={data.capsuleDate ?? ""} onChange={(e) => set("capsuleDate", e.target.value || null)} />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h1>O que vocês querem usar?</h1>
            <p className="lede">Dá para ligar e desligar cada recurso depois, no editor.</p>
            <div className="feature-grid">
              {FEATURES.map((f) => (
                <label key={f.id} className="feature">
                  <input
                    type="checkbox"
                    checked={data.features.includes(f.id)}
                    onChange={(e) =>
                      set("features", e.target.checked ? [...data.features, f.id] : data.features.filter((x) => x !== f.id))
                    }
                  />
                  <span>
                    <strong>{SECTIONS[f.id].label}</strong>
                    {f.hint}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        {step === 5 && weddingId && (
          <>
            <h1>Referências visuais</h1>
            <p className="lede">
              Enviem imagens de convites, flores, decoração ou sites de que gostam. O estúdio usa essas referências para criar a
              identidade de vocês.
            </p>
            <ReferenceUploader weddingId={weddingId} initial={[]} />
          </>
        )}

        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}

        <div className="onb-actions">
          {step > 0 && step < 5 && (
            <button type="button" className="btn ghost" onClick={() => setStep((s) => s - 1)}>
              Voltar
            </button>
          )}
          <span className="spacer" />
          {step > 0 && step < 4 && (
            <button type="button" className="text-link" onClick={() => setStep((s) => s + 1)}>
              Pular por enquanto
            </button>
          )}
          {step < 5 ? (
            <button type="button" className="btn primary" onClick={next} disabled={pending}>
              {pending ? "Criando…" : step === 4 ? "Criar o casamento" : "Continuar"}
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => router.push(`/painel/${weddingId}`)}>
              Ir para o painel
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
