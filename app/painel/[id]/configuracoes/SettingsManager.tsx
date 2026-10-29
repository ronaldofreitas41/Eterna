"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateSettings, type SettingsPatch } from "@/app/painel/acoes/configuracoes";
import { PHASE_NAMES } from "@/lib/phase";
import { PLANS } from "@/lib/plans";
import type { PhaseSetting, SitePhase, Wedding } from "@/lib/types";
import { deleteWedding } from "../../actions";
import { useServerState } from "@/components/useServerState";

type Props = { wedding: Wedding; autoPhase: SitePhase; publicUrl: string; qrSvg: string };

const PHASE_OPTIONS: { id: PhaseSetting; label: string; hint: string }[] = [
  { id: "auto", label: "Automático pela data", hint: "Antes do dia, no dia e depois do dia." },
  { id: "antes", label: "Antes · convite", hint: "História, contagem regressiva, presença e logística." },
  { id: "durante", label: "Durante · ao vivo", hint: "Avisos, missão, programação ao vivo e envio de fotos." },
  { id: "depois", label: "Depois · memória", hint: "Agradecimento, álbum, livro de mensagens e cápsula." },
];

export default function SettingsManager({ wedding, autoPhase, publicUrl, qrSvg }: Props) {
  const router = useRouter();
  const [w, setW] = useServerState(wedding);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, startDelete] = useTransition();
  const say = (text: string, ok = true) => setMsg({ text, ok });

  async function save(patch: SettingsPatch, text: string) {
    const res = await updateSettings(w.id, patch);
    if (!res.ok) {
      say(res.error, false);
      return false;
    }
    setW((x) => ({ ...x, ...res.data }));
    say(text);
    router.refresh();
    return true;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      say("Link copiado.");
    } catch {
      window.prompt("Copiem o link:", text);
    }
  }

  return (
    <div className="stack-lg">
      {msg && (
        <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
          {msg.text}
        </p>
      )}

      <section className="card">
        <h2>Fase do site</h2>
        <p className="muted small">
          No automático, hoje o site está em <strong>{PHASE_NAMES[autoPhase]}</strong>. Vocês podem fixar uma fase a qualquer momento e
          voltar ao automático depois: nenhuma mudança é definitiva.
        </p>
        <div className="phase-grid" role="radiogroup" aria-label="Fase do site">
          {PHASE_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={w.phase === p.id}
              className="phase-option"
              onClick={() => save({ phase: p.id }, `Fase alterada para “${p.label}”.`)}
            >
              <strong>{p.label}</strong>
              <span>{p.hint}</span>
            </button>
          ))}
        </div>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save({ live_notice: String(f.get("notice") ?? "").trim(), mission: String(f.get("mission") ?? "").trim() }, "Avisos atualizados. Eles aparecem na hora no site.");
          }}
        >
          <label className="field">
            <span>Aviso para os convidados (aparece na fase “durante”)</span>
            <textarea id="set-notice" name="notice" rows={2} maxLength={500} defaultValue={w.live_notice} placeholder="Ex.: a cerimônia foi transferida para o salão por causa da chuva." />
          </label>
          <label className="field">
            <span>Missão ou desafio do dia</span>
            <input id="set-mission" name="mission" maxLength={300} defaultValue={w.mission} placeholder="Ex.: tire uma foto com alguém que você conheceu hoje." />
          </label>
          <button className="btn ghost small">Salvar avisos</button>
        </form>
      </section>

      <section className="card two-col">
        <div>
          <h2>QR Code do casamento</h2>
          <p className="muted small">Imprimam nas mesas ou no convite. Leva direto ao site público{w.published ? "" : " (publiquem o site antes)"}.</p>
          <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} role="img" aria-label={`QR Code para ${publicUrl}`} />
        </div>
        <div className="stack">
          <span className="mono">Endereço público</span>
          <code className="url">{publicUrl}</code>
          <div className="row-actions">
            <button type="button" className="btn ghost small" onClick={() => copy(publicUrl)}>
              Copiar link
            </button>
            {w.published && (
              <a className="btn ghost small" href={publicUrl} target="_blank" rel="noopener noreferrer">
                Abrir site
              </a>
            )}
          </div>
          <p className="muted small">
            Domínio próprio (ex.: helenaerafael.com.br): a estrutura já está preparada, mas a conexão de domínios ainda não está
            disponível nesta versão.
          </p>
        </div>
      </section>

      <section className="card">
        <h2>Dados do casamento</h2>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const slug = String(f.get("slug") ?? "");
            save(
              {
                partner_one: String(f.get("p1")).trim(),
                partner_two: String(f.get("p2")).trim(),
                wedding_date: String(f.get("date") || "") || null,
                city: String(f.get("city") ?? "").trim(),
                venue: String(f.get("venue") ?? "").trim(),
                slug,
              },
              "Dados salvos.",
            );
          }}
        >
          <div className="row2">
            <label className="field">
              <span>Nome</span>
              <input id="set-p1" name="p1" required maxLength={80} defaultValue={w.partner_one} />
            </label>
            <label className="field">
              <span>Nome</span>
              <input id="set-p2" name="p2" required maxLength={80} defaultValue={w.partner_two} />
            </label>
          </div>
          <div className="row3">
            <label className="field">
              <span>Data</span>
              <input id="set-date" name="date" type="date" defaultValue={w.wedding_date ?? ""} />
            </label>
            <label className="field">
              <span>Cidade</span>
              <input id="set-city" name="city" maxLength={120} defaultValue={w.city} />
            </label>
            <label className="field">
              <span>Local</span>
              <input id="set-venue" name="venue" maxLength={160} defaultValue={w.venue} />
            </label>
          </div>
          <label className="field">
            <span>Endereço do site (/c/…)</span>
            <input id="set-slug" name="slug" required maxLength={60} defaultValue={w.slug} />
            <small>Ao trocar, o link e o QR Code antigos deixam de funcionar.</small>
          </label>
          <button className="btn primary small">Salvar dados</button>
        </form>
        <p className="muted small">
          Plano atual: <strong>{PLANS.find((p) => p.id === w.plan)?.name}</strong> (demonstrativo, sem cobrança). <Link href="/planos">Ver planos</Link>
        </p>
      </section>

      <section className="card danger-zone">
        <h2>Privacidade e dados</h2>
        <p className="muted small">
          Vocês podem baixar todos os dados do casamento a qualquer momento. Convidados podem pedir a remoção de uma contribuição ou foto:
          basta excluí-la em Construir Juntos ou Fotos.
        </p>
        <a className="btn ghost small" href={`/api/exportar/${w.id}`} download>
          Exportar dados (JSON)
        </a>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            startDelete(async () => {
              const res = await deleteWedding(w.id, confirm);
              if (res?.error) say(res.error, false);
            });
          }}
        >
          <label className="field">
            <span>
              Para excluir o casamento e todos os dados, fotos e mensagens, digitem <strong>{w.slug}</strong>
            </span>
            <input id="set-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </label>
          <button className="btn danger small" disabled={confirm !== w.slug || deleting}>
            {deleting ? "Excluindo…" : "Excluir casamento definitivamente"}
          </button>
        </form>
      </section>
    </div>
  );
}
