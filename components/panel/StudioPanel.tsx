"use client";

import { useEffect, useRef, useState } from "react";
import { addStudioMessages } from "@/app/painel/acoes/estudio";
import { LOCKABLE, LockKey, Proposal, ReferencePalette, applyProposal, parseProposals } from "@/lib/studio";
import { runDemoCommand } from "@/lib/studio-demo";
import type { StudioMessage } from "@/lib/types";
import type { WorkspaceApi } from "./DesignWorkspace";
import ReferenceUploader, { type RefView } from "./ReferenceUploader";

type Msg = { id: string; role: "user" | "assistant"; content: string; proposals: Proposal[]; simulated: boolean };

const EXAMPLES = [
  "Quero fundo marfim, verde sálvia, flores delicadas e a história como linha do tempo. Sofisticado, minimalista e emocional.",
  "Deixe o site mais minimalista.",
  "Troque as flores por folhagens.",
  "Use as cores da referência 1.",
  "Mantenha a tipografia, mas mude a composição.",
  "Crie uma versão mais clássica.",
  "Volte para a versão anterior.",
];

const UNDO = /\b(volte|voltar|desfa[cz]a?|desfazer)\b/;

type Props = {
  api: WorkspaceApi;
  weddingId: string;
  refs: RefView[];
  initialMessages: StudioMessage[];
  aiEnabled: boolean;
};

export default function StudioPanel({ api, weddingId, refs, initialMessages, aiEnabled }: Props) {
  const [messages, setMessages] = useState<Msg[]>(() =>
    initialMessages.map((m) => ({ ...m, proposals: parseProposals(m.proposals, api.design.theme) })),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [locks, setLocks] = useState<Set<LockKey>>(new Set());
  const [refPalettes, setRefPalettes] = useState<ReferencePalette[]>([]);
  const [applied, setApplied] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [messages.length]);

  async function persist(rows: Omit<Msg, "id">[]) {
    const res = await addStudioMessages(weddingId, rows);
    if (!res.ok) api.notify("A conversa não foi salva no histórico, mas as propostas continuam aqui.", false);
  }

  async function send(text: string) {
    const request = text.trim();
    if (!request || busy) return;
    setInput("");
    const user: Msg = { id: crypto.randomUUID(), role: "user", content: request, proposals: [], simulated: false };
    setMessages((m) => [...m, user]);
    setBusy(true);

    let reply: Omit<Msg, "id">;
    const q = request.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (UNDO.test(q) && q.length < 60) {
      const ok = api.undo();
      reply = {
        role: "assistant",
        content: ok ? "Voltei para a versão anterior. A prévia já mostra como estava." : "Não há alteração anterior para desfazer nesta sessão. Vocês podem restaurar uma versão em Versões.",
        proposals: [],
        simulated: !aiEnabled,
      };
    } else if (aiEnabled) {
      try {
        const res = await fetch("/api/estudio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weddingId, request, locks: [...locks], design: api.design }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "O estúdio não respondeu.");
        reply = { role: "assistant", content: json.reply, proposals: parseProposals(json.proposals, api.design.theme), simulated: false };
      } catch (err) {
        reply = { role: "assistant", content: (err as Error).message, proposals: [], simulated: false };
      }
    } else {
      const r = runDemoCommand(request, api.design, refPalettes);
      reply = { role: "assistant", content: r.reply, proposals: r.proposals, simulated: true };
    }

    setMessages((m) => [...m, { ...reply, id: crypto.randomUUID() }]);
    setBusy(false);
    persist([user, reply]);
  }

  async function apply(p: Proposal) {
    const next = applyProposal(api.design, p, locks);
    api.update(next);
    setApplied(p.label);
    await api.saveVersion(`Estúdio: ${p.label}`, "estudio", next);
    api.notify(`Proposta “${p.label}” aplicada. Salvem o rascunho ou publiquem quando estiverem prontos.`);
  }

  return (
    <div className="side-panel studio">
      {!aiEnabled && (
        <p className="notice demo" role="note">
          <strong>Modo demonstrativo.</strong> A geração por IA está simulada: o estúdio entende comandos comuns e aplica mudanças
          reais no design. Para usar a IA, configurem ANTHROPIC_API_KEY (veja o README).
        </p>
      )}

      <details className="studio-block" open={refs.length === 0}>
        <summary>
          <h3 className="sub">Referências visuais</h3>
        </summary>
        <ReferenceUploader
          weddingId={weddingId}
          initial={refs}
          onPalettes={setRefPalettes}
          onUsePalette={(palette, n) => {
            if (locks.has("palette")) return api.notify("As cores estão travadas. Destravem para trocar.", false);
            api.update((d) => ({ ...d, theme: { ...d.theme, palette } }));
            api.notify(`Cores da referência ${n} aplicadas.`);
          }}
        />
      </details>

      <div className="studio-block">
        <h3 className="sub">Manter como está</h3>
        <div className="chip-toggles" role="group" aria-label="Elementos travados">
          {(Object.keys(LOCKABLE) as LockKey[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={locks.has(k)}
              onClick={() =>
                setLocks((s) => {
                  const n = new Set(s);
                  if (n.has(k)) n.delete(k);
                  else n.add(k);
                  return n;
                })
              }
            >
              {locks.has(k) ? "Travado: " : ""}
              {LOCKABLE[k]}
            </button>
          ))}
        </div>
        <p className="muted small">O que estiver travado não muda nas próximas propostas.</p>
      </div>

      <div className="chat" aria-live="polite">
        {messages.length === 0 && (
          <p className="muted">Contem como imaginam o site. Cada pedido gera propostas que vocês comparam na prévia antes de aplicar.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <span className="who">
              {m.role === "user" ? "Vocês" : "Estúdio"}
              {m.role === "assistant" && m.simulated && <span className="chip">simulado</span>}
            </span>
            <p>{m.content}</p>
            {m.proposals.length > 0 && (
              <div className="proposals">
                {m.proposals.map((p, i) => (
                  <div key={i} className="proposal">
                    <span className="mini-swatch" aria-hidden="true">
                      {Object.values(p.theme.palette).map((c, k) => (
                        <i key={k} style={{ background: c }} />
                      ))}
                    </span>
                    <strong>{p.label}</strong>
                    <p className="small">{p.summary}</p>
                    <div className="row-actions">
                      <button type="button" className="btn ghost small" onClick={() => api.preview(applyProposal(api.design, p, locks), p.label)}>
                        Ver na prévia
                      </button>
                      <button type="button" className="btn primary small" onClick={() => apply(p)}>
                        {applied === p.label ? "Aplicada" : "Aplicar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant typing">O estúdio está criando as propostas…</div>}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label className="sr-only" htmlFor="studio-input">
          Pedido para o estúdio
        </label>
        <textarea
          id="studio-input"
          rows={3}
          maxLength={4000}
          value={input}
          placeholder="Ex.: troque as flores por folhagens e deixe o menu centralizado"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn primary" disabled={busy || !input.trim()}>
          {busy ? "Criando…" : "Enviar"}
        </button>
      </form>
      <div className="examples" aria-label="Exemplos de pedidos">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => send(ex)} disabled={busy}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
