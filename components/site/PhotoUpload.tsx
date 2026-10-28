"use client";

import { useState } from "react";
import { uploadGalleryPhotos } from "@/app/c/actions";
import { prepareImage } from "./upload";

export default function PhotoUpload({ weddingId, disabled }: { weddingId: string; disabled: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const files = (f.getAll("files") as File[]).filter((x) => x.size > 0);
    if (!files.length) return setError("Escolha pelo menos uma foto.");
    if (files.length > 10) return setError("Envie até 10 fotos por vez.");
    if (!f.get("consent")) return setError("Para enviar, autorize a publicação das fotos.");
    setError("");
    setStatus("sending");
    // Uma foto por requisição: se uma falhar, as outras continuam.
    let sent = 0;
    const failures: string[] = [];
    for (const [i, file] of files.entries()) {
      setProgress(`Enviando ${i + 1} de ${files.length}…`);
      try {
        const body = new FormData();
        body.set("weddingId", weddingId);
        body.set("name", String(f.get("name") ?? ""));
        body.set("caption", String(f.get("caption") ?? ""));
        body.set("consent", "on");
        body.append("files", await prepareImage(file));
        const res = await uploadGalleryPhotos(body);
        if (res.ok) sent++;
        else failures.push(`${file.name}: ${res.error}`);
      } catch (err) {
        failures.push(`${file.name}: ${(err as Error).message}`);
      }
    }
    setProgress("");
    if (failures.length) setError(failures.join(" "));
    if (sent) {
      form.reset();
      setStatus("done");
    } else setStatus("idle");
  }

  return (
    <form className="s-form s-upload" onSubmit={submit}>
      <h3>Envie suas fotos</h3>
      <div className="s-row">
        <label>
          <span>Seu nome</span>
          <input id={`ph-name-${weddingId}`} name="name" maxLength={80} disabled={disabled} autoComplete="name" />
        </label>
        <label>
          <span>Legenda (opcional)</span>
          <input id={`ph-caption-${weddingId}`} name="caption" maxLength={300} disabled={disabled} />
        </label>
      </div>
      <label>
        <span>Fotos (até 10 por vez)</span>
        <input id={`ph-files-${weddingId}`} name="files" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={disabled} />
      </label>
      <label className="s-check">
        <input id={`ph-consent-${weddingId}`} name="consent" type="checkbox" disabled={disabled} />
        <span>As fotos são minhas ou tenho autorização de quem aparece nelas, e autorizo a publicação no álbum do casamento.</span>
      </label>
      <button className="s-btn" disabled={disabled || status === "sending"}>
        {status === "sending" ? progress || "Enviando…" : "Enviar fotos"}
      </button>
      {status === "done" && (
        <p className="s-done" role="status">
          Fotos enviadas. Elas aparecem no álbum depois que os noivos aprovarem.
        </p>
      )}
      {error && (
        <p className="s-err" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
