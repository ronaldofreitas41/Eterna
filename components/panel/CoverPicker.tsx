"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeCover, uploadCover } from "@/app/painel/acoes/fotos";
import { prepareImage } from "@/components/site/upload";

/** Foto de capa do site, trocada direto do editor (a prévia atualiza em seguida). */
export default function CoverPicker({ weddingId, coverUrl }: { weddingId: string; coverUrl: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.set("weddingId", weddingId);
      body.set("file", await prepareImage(file));
      const res = await uploadCover(body);
      if (!res.ok) throw new Error(res.error);
      setMsg({ ok: true, text: "Foto de capa atualizada." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    const res = await removeCover(weddingId);
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Foto de capa removida." } : { ok: false, text: res.error });
    if (res.ok) router.refresh();
  }

  return (
    <div className="cover-picker">
      <h3 className="sub">Foto de capa</h3>
      <div className="cover-row">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Capa atual" className="cover-thumb small" />
        ) : (
          <span className="cover-thumb small ref-ph" aria-hidden="true" />
        )}
        <div className="stack">
          <label className="btn ghost small file-btn">
            <input id="cover-picker-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
            {busy ? "Enviando…" : coverUrl ? "Trocar foto" : "Escolher foto"}
          </label>
          {coverUrl && (
            <button type="button" className="text-link danger small" onClick={remove} disabled={busy}>
              Remover foto
            </button>
          )}
        </div>
      </div>
      {msg && (
        <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
