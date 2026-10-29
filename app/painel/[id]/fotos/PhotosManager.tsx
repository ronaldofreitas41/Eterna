"use client";

import { useState } from "react";
import { deletePhoto, setPhotoStatus } from "@/app/painel/acoes/fotos";
import type { Photo } from "@/lib/types";
import ConfirmButton from "@/components/panel/ConfirmButton";
import { useServerState } from "@/components/useServerState";

type Item = Photo & { url: string | null };
type Props = { weddingId: string; initialPhotos: Item[] };

/** Galeria colaborativa: fotos pendentes, aprovadas e recusadas. A foto de capa fica em Meu site → Aparência. */
export default function PhotosManager({ weddingId, initialPhotos }: Props) {
  const [photos, setPhotos] = useServerState(initialPhotos);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (text: string, ok = true) => setMsg({ text, ok });

  async function setStatus(p: Item, status: Photo["status"]) {
    const res = await setPhotoStatus(weddingId, p.id, status);
    if (!res.ok) return say(res.error, false);
    setPhotos((l) => l.map((x) => (x.id === p.id ? { ...x, status } : x)));
    say(status === "approved" ? "Foto aprovada. Ela já aparece no álbum." : status === "rejected" ? "Foto recusada." : "Foto voltou para a revisão.");
  }

  async function remove(p: Item) {
    const res = await deletePhoto(weddingId, p.id);
    if (!res.ok) return say(res.error, false);
    setPhotos((l) => l.filter((x) => x.id !== p.id));
    say("Foto excluída definitivamente.");
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
        <h2>Para revisar ({pending.length})</h2>
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
          "Nenhuma foto esperando revisão. As fotos dos convidados chegam aqui primeiro.",
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
