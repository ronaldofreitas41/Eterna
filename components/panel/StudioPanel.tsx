"use client";

import { useEffect, useRef, useState } from "react";
import { addStudioMessages } from "@/app/painel/acoes/estudio";
import { LOCKABLE, LockKey, Proposal, ReferencePalette, applyProposal, parseProposals } from "@/lib/studio";
import { runDemoCommand } from "@/lib/studio-demo";
import type { StudioMessage } from "@/lib/types";
import type { WorkspaceApi } from "./DesignWorkspace";
import ReferenceUploader, { type RefView } from "./ReferenceUploader";

type Msg = { id: string; role: "user" | "assistant"; content: string; proposals: Proposal[]; simulated: boolean };

const EXAMPLES = ["Deixe o site mais minimalista.", "Quero mais verde e menos bege.", "Deixe a página mais romântica.", "Volte para a versão anterior."];

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

  // scrollIntoView pode devolver uma Promise nos navegadores atuais: o efeito não pode retorná-la.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  // Conversa atualizada no servidor (outro aparelho): substitui a lista, exceto durante um pedido em andamento.
  useEffect(() => {
    if (busy) return;
    setMessages(initialMessages.map((m) => ({ ...m, proposals: parseProposals(m.proposals, api.design.theme) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages]);

  async function persist(rows: Omit<Msg, "id">[]) {
    const res = await addStudioMessages(weddingId, rows);
    if (!res.ok) api.notify("A conversa não foi guardada no histórico, mas as opções continuam aqui.", false);
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
    await api.saveVersion(`Assistente: ${p.label}`, "estudio", next);
    api.notify(`Pronto! O site agora usa “${p.label}”.`);
  }

  return (
    <div className="side-panel studio">
      {!aiEnabled && (
        <p className="notice demo" role="note">
          <strong>Assistente em demonstração.</strong> Ele entende pedidos simples, como os exemplos abaixo, e muda o site de verdade.
          Para pedidos com as palavras de vocês, o assistente de criação precisa ser configurado.
        </p>
      )}

      <div className="chat" aria-live="polite">
        {messages.length === 0 && (
          <p className="muted">
            Digam o que gostariam de mudar, do jeito que falariam com uma pessoa. A prévia mostra o resultado antes de vocês decidirem.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <span className="who">
              {m.role === "user" ? "Vocês" : "Assistente"}
              {m.role === "assistant" && m.simulated && <span className="chip">demonstração</span>}
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
                        Ver como fica
                      </button>
                      <button type="button" className="btn primary small" onClick={() => apply(p)}>
                        {applied === p.label ? "Usando esta" : "Usar esta"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant typing">Preparando duas opções para vocês…</div>}
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
          O que vocês querem mudar
        </label>
        <textarea
          id="studio-input"
          rows={3}
          maxLength={4000}
          value={input}
          placeholder="Ex.: quero mais verde e menos bege"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn primary" disabled={busy || !input.trim()}>
          {busy ? "Preparando…" : "Pedir"}
        </button>
      </form>
      <div className="examples" aria-label="Exemplos de pedidos">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => send(ex)} disabled={busy}>
            {ex}
          </button>
        ))}
      </div>

      <details className="studio-block">
        <summary>Imagens de referência</summary>
        <ReferenceUploader
          weddingId={weddingId}
          initial={refs}
          onPalettes={setRefPalettes}
          onUsePalette={(palette, n) => {
            if (locks.has("palette")) return api.notify("As cores estão mantidas como estão. Liberem em “Mais opções” para trocar.", false);
            api.update((d) => ({ ...d, theme: { ...d.theme, palette } }));
            api.notify(`Cores da imagem ${n} aplicadas.`);
          }}
        />
      </details>

      <details className="studio-block">
        <summary>Mais opções</summary>
        <p className="muted small">Escolham o que deve continuar igual nos próximos pedidos.</p>
        <div className="chip-toggles" role="group" aria-label="Manter como está">
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
              {locks.has(k) ? "Manter: " : ""}
              {LOCKABLE[k]}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
