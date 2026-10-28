"use client";

import { useState } from "react";
import type { SiteCampaign } from "@/lib/site";
import { submitContribution } from "@/app/c/actions";
import { prepareImage } from "./upload";

type Props = { weddingId: string; campaign: SiteCampaign | null; token: string | null; disabled: boolean };

export default function ContributionForm({ weddingId, campaign, token, disabled }: Props) {
  const kind = campaign?.kind ?? "memory";
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const uid = `${weddingId}-${campaign?.id ?? "livro"}`;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get("photo") as File | null;
    const hasPhoto = Boolean(file && file.size > 0);
    if (kind === "photo" && !hasPhoto) return setError("Escolha a fotografia que você quer enviar.");
    if (kind !== "photo" && !String(f.get("body") ?? "").trim()) return setError("Escreva sua mensagem.");
    if (!f.get("consent")) return setError("Para enviar, autorize o uso da sua contribuição.");
    setError("");
    setStatus("sending");
    try {
      const body = new FormData();
      body.set("weddingId", weddingId);
      if (campaign) body.set("campaignId", campaign.id);
      if (token) body.set("token", token);
      body.set("kind", kind);
      for (const k of ["name", "relation", "title", "body"]) body.set(k, String(f.get(k) ?? ""));
      body.set("consent", "on");
      if (hasPhoto) body.set("photo", await prepareImage(file!));
      const res = await submitContribution(body);
      if (!res.ok) throw new Error(res.error);
      form.reset();
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }

  if (status === "done")
    return (
      <div className="s-done" role="status">
        <p>
          {kind === "capsule"
            ? "Mensagem lacrada. Os noivos só vão conseguir ler na data da cápsula do tempo."
            : "Recebido. Os noivos vão ler antes de publicar."}
        </p>
        <button type="button" className="s-link" onClick={() => setStatus("idle")}>
          Enviar outra
        </button>
      </div>
    );

  return (
    <form className="s-form" onSubmit={submit}>
      <div className="s-row">
        <label>
          <span>Seu nome</span>
          <input id={`ct-name-${uid}`} name="name" required maxLength={80} disabled={disabled} autoComplete="name" />
        </label>
        <label>
          <span>De onde você conhece o casal</span>
          <input id={`ct-rel-${uid}`} name="relation" maxLength={80} placeholder="Ex.: prima da noiva" disabled={disabled} />
        </label>
      </div>
      <label>
        <span>Título (opcional)</span>
        <input id={`ct-title-${uid}`} name="title" maxLength={160} disabled={disabled} />
      </label>
      <label>
        <span>{kind === "advice" ? "Seu conselho" : kind === "capsule" ? "Sua mensagem para o futuro" : kind === "photo" ? "Conte sobre a foto (opcional)" : "Sua mensagem"}</span>
        <textarea id={`ct-body-${uid}`} name="body" maxLength={4000} rows={4} disabled={disabled} required={kind !== "photo"} />
      </label>
      {kind !== "capsule" && (
        <label>
          <span>{kind === "photo" ? "Fotografia (JPG, PNG ou WEBP)" : "Foto (opcional)"}</span>
          <input id={`ct-photo-${uid}`} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={disabled} />
        </label>
      )}
      <label className="s-check">
        <input id={`ct-consent-${uid}`} name="consent" type="checkbox" disabled={disabled} />
        <span>
          Autorizo os noivos a usar esta contribuição no site do casamento. Ela fica privada até ser aprovada, e posso pedir a
          remoção quando quiser.
        </span>
      </label>
      <button className="s-btn" disabled={disabled || status === "sending"}>
        {status === "sending" ? "Enviando…" : kind === "capsule" ? "Lacrar mensagem" : "Enviar"}
      </button>
      {error && <p className="s-err" role="alert">{error}</p>}
    </form>
  );
}
