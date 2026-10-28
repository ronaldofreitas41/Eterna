"use client";

import { useState } from "react";
import { deletePhoto, removeCover, setPhotoStatus, uploadCover } from "@/app/painel/acoes/fotos";
import type { Photo } from "@/lib/types";
import { prepareImage } from "@/components/site/upload";
import ConfirmButton from "@/components/panel/ConfirmButton";
import { useServerState } from "@/components/useServerState";

type Item = Photo & { url: string | null };
type Props = { weddingId: string; initialPhotos: Item[]; initialCover: string | null };

export default function PhotosManager({ weddingId, initialPhotos, initialCover }: Props) {
  const [photos, setPhotos] = useServerState(initialPhotos);
  const [cover, setCover] = useServerState(initialCover);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (text: string, ok = true) => setMsg({ text, ok });

  async function setStatus(p: Item, status: Photo["status"]) {
    const res = await setPhotoStatus(weddingId, p.id, status);
    if (!res.ok) return say(res.error, false);
    setPhotos((l) => l.map((x) => (x.id === p.id ? { ...x, status } : x)));
    say(status === "approved" ? "Foto aprovada. Ela já aparece no álbum." : status === "rejected" ? "Foto recusada." : "Foto voltou para a fila.");
  }

  async function remove(p: Item) {
    const res = await deletePhoto(weddingId, p.id);
    if (!res.ok) return say(res.error, false);
    setPhotos((l) => l.filter((x) => x.id !== p.id));
    say("Foto excluída definitivamente.");
  }

  async function onUploadCover(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("weddingId", weddingId);
      body.set("file", await prepareImage(file));
      const res = await uploadCover(body);
      if (!res.ok) throw new Error(res.error);
      setCover(res.data);
      say("Capa atualizada. Ela aparece no topo do site.");
    } catch (err) {
      say((err as Error).message, false);
    }
    setBusy(false);
  }

  async function onRemoveCover() {
    const res = await removeCover(weddingId);
    if (!res.ok) return say(res.error, false);
    setCover(null);
    say("Capa removida.");
  }

  const grid = (list: Item[], actions: (p: Item) => React.ReactNode, empty: string) =>
    list.length === 0 ? (
      <p className="empty-state">{empty}</p>
    ) : (
      <div className="photo-grid">
        {list.map((p) => (
          <figure key={p.id}>
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.url} alt={p.caption || "Foto de convidado"} loading="lazy" />
            ) : (
              <span className="ref-ph" />
            )}
            <figcaption>
              <span>
                {p.uploader_name || "Sem nome"}
                {p.caption && ` · ${p.caption}`}
              </span>
              <span className="row-actions">{actions(p)}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    );

  const pending = photos.filter((p) => p.status === "pending");
  const approved = photos.filter((p) => p.status === "approved");
  const rejected = photos.filter((p) => p.status === "rejected");

  return (
    <div className="stack-lg">
      {msg && (
        <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
          {msg.text}
        </p>
      )}

      <section className="card">
        <h2>Capa do site</h2>
        <div className="cover-row">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="Capa atual" className="cover-thumb" />
          ) : (
            <span className="cover-thumb ref-ph" />
          )}
          <div className="stack">
            <label className="btn ghost small file-btn">
              <input id="cover-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onUploadCover(e.target.files?.[0])} disabled={busy} />
              {busy ? "Enviando…" : cover ? "Trocar capa" : "Enviar capa"}
            </label>
            {cover && <ConfirmButton label="Remover capa" confirmLabel="Confirmar" onConfirm={onRemoveCover} />}
            <small className="muted">Aparece em destaque no layout “capa dividida” e abaixo dos nomes nos outros layouts.</small>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Aguardando aprovação ({pending.length})</h2>
        {grid(
          pending,
          (p) => (
            <>
              <button type="button" className="btn primary small" onClick={() => setStatus(p, "approved")}>
                Aprovar
              </button>
              <button type="button" className="text-link" onClick={() => setStatus(p, "rejected")}>
                Recusar
              </button>
            </>
          ),
          "Nenhuma foto aguardando. No dia do casamento, as fotos dos convidados chegam aqui.",
        )}
      </section>

      <section className="card">
        <h2>No álbum ({approved.length})</h2>
        {grid(
          approved,
          (p) => (
            <>
              <button type="button" className="text-link" onClick={() => setStatus(p, "pending")}>
                Tirar do álbum
              </button>
              <ConfirmButton label="Excluir" confirmLabel="Excluir?" onConfirm={() => remove(p)} small />
            </>
          ),
          "Nenhuma foto aprovada ainda.",
        )}
      </section>

      {rejected.length > 0 && (
        <section className="card">
          <h2>Recusadas ({rejected.length})</h2>
          {grid(
            rejected,
            (p) => (
              <>
                <button type="button" className="text-link" onClick={() => setStatus(p, "approved")}>
                  Aprovar
                </button>
                <ConfirmButton label="Excluir" confirmLabel="Excluir?" onConfirm={() => remove(p)} small />
              </>
            ),
            "",
          )}
        </section>
      )}
    </div>
  );
}
