"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemories } from "../../acoes/criar";
import { updateSettings } from "../../acoes/configuracoes";
import CopyLinkButton from "@/components/panel/CopyLinkButton";

type Props = { weddingId: string; on: boolean; published: boolean; shareUrl: string; qrSvg: string; capsuleDate: string | null };

export default function MemoriesSwitch({ weddingId, on, published, shareUrl, qrSvg, capsuleDate }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const path = new URL(shareUrl).pathname;

  function toggle(next: boolean) {
    start(async () => {
      const res = await setMemories(weddingId, next);
      setMsg(
        res.ok
          ? { ok: true, text: next ? "Memórias ativadas. Compartilhem o link ou o QR Code." : "Envio pausado. O que já chegou continua aqui." }
          : { ok: false, text: res.error },
      );
      if (res.ok) router.refresh();
    });
  }

  if (!on)
    return (
      <section className="card memories-intro">
        <h2>Quando quiserem, os convidados ajudam a contar essa história</h2>
        <ul className="plain-list">
          <li>Eles abrem um link ou leem um QR Code, sem precisar de cadastro.</li>
          <li>Escolhem enviar uma mensagem, uma foto ou uma lembrança.</li>
          <li>Nada aparece no site antes de vocês aprovarem.</li>
        </ul>
        <p className="muted small">Muitos casais ativam perto do casamento, para receber fotos durante a festa.</p>
        <div className="row-actions">
          <button type="button" className="btn primary large" onClick={() => toggle(true)} disabled={pending}>
            {pending ? "Ativando…" : "Ativar memórias"}
          </button>
        </div>
        {msg && (
          <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
            {msg.text}
          </p>
        )}
      </section>
    );

  return (
    <section className="card two-col memories-share">
      <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} role="img" aria-label="QR Code para enviar memórias" />
      <div className="stack">
        <h2>Compartilhem com os convidados</h2>
        <p className="muted">Coloquem o QR Code nas mesas ou enviem o link. Os convidados escolhem como contribuir e enviam.</p>
        {!published && <p className="notice">Publiquem o site para o link funcionar para os convidados.</p>}
        <code className="url">{shareUrl}</code>
        <div className="row-actions">
          <CopyLinkButton path={path} label="Copiar link" className="btn ghost small" />
          {published && (
            <a className="btn ghost small" href={path} target="_blank" rel="noopener noreferrer">
              Ver como o convidado vê
            </a>
          )}
          <button type="button" className="text-link" onClick={() => toggle(false)} disabled={pending}>
            Pausar o envio
          </button>
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const v = String(new FormData(e.currentTarget).get("capsule") || "") || null;
            start(async () => {
              const res = await updateSettings(weddingId, { capsule_open_date: v });
              setMsg(res.ok ? { ok: true, text: v ? "Data da cápsula salva." : "Cápsula sem data de abertura." } : { ok: false, text: res.error });
            });
          }}
        >
          <label className="field inline">
            <span>Cápsula do tempo abre em</span>
            <input id="mem-capsule" name="capsule" type="date" defaultValue={capsuleDate ?? ""} />
          </label>
          <button className="btn ghost small" disabled={pending}>
            Salvar data
          </button>
        </form>
        {msg && (
          <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
