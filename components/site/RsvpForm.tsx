"use client";

import { useState } from "react";
import { submitInvitationRsvp, submitOpenRsvp } from "@/app/c/actions";
import type { SiteData } from "@/lib/site";

type Props = { weddingId: string; invitation: SiteData["invitation"]; disabled: boolean };

export default function RsvpForm({ weddingId, invitation, disabled }: Props) {
  const max = invitation?.max_party_size ?? 20;
  const [attending, setAttending] = useState(invitation?.guest.attending ?? true);
  const [status, setStatus] = useState<"idle" | "sending" | "done">(invitation?.guest.responded_at ? "done" : "idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    const f = new FormData(e.currentTarget);
    const partySize = attending ? Number(f.get("party_size") || 1) : 0;
    if (attending && (partySize < 1 || partySize > max)) return setError(`Este convite permite até ${max} pessoa(s).`);
    setError("");
    setStatus("sending");
    const message = String(f.get("message") ?? "");
    const res = invitation
      ? await submitInvitationRsvp({ weddingId, token: invitation.token, attending, partySize, companions: String(f.get("companions") ?? ""), message })
      : await submitOpenRsvp({ weddingId, name: String(f.get("name") ?? ""), contact: String(f.get("contact") ?? ""), attending, partySize, message });
    if (!res.ok) {
      setError(res.error);
      setStatus("idle");
    } else setStatus("done");
  }

  if (status === "done")
    return (
      <div className="s-done" role="status">
        <p>{attending ? "Presença confirmada. Até lá!" : "Obrigado por avisar. Você vai fazer falta."}</p>
        {invitation && (
          <button type="button" className="s-link" onClick={() => setStatus("idle")}>
            Alterar resposta
          </button>
        )}
      </div>
    );

  return (
    <form className="s-form" onSubmit={submit}>
      <div className="s-choice" role="group" aria-label="Você vai?">
        <button type="button" aria-pressed={attending} onClick={() => setAttending(true)} disabled={disabled}>
          Vou com certeza
        </button>
        <button type="button" aria-pressed={!attending} onClick={() => setAttending(false)} disabled={disabled}>
          Não poderei ir
        </button>
      </div>
      {!invitation && (
        <div className="s-row">
          <label>
            <span>Seu nome</span>
            <input id={`rsvp-name-${weddingId}`} name="name" required maxLength={120} disabled={disabled} autoComplete="name" />
          </label>
          <label>
            <span>E-mail ou telefone (opcional)</span>
            <input id={`rsvp-contact-${weddingId}`} name="contact" maxLength={160} disabled={disabled} />
          </label>
        </div>
      )}
      {attending && (
        <div className="s-row">
          <label>
            <span>Quantas pessoas, contando você{invitation ? ` (até ${max})` : ""}</span>
            <input id={`rsvp-size-${weddingId}`} name="party_size" type="number" min={1} max={max} defaultValue={invitation?.guest.party_size || 1} disabled={disabled} />
          </label>
          {invitation && max > 1 && (
            <label>
              <span>Nome dos acompanhantes</span>
              <input id={`rsvp-companions-${weddingId}`} name="companions" maxLength={500} defaultValue={invitation.guest.companions} disabled={disabled} />
            </label>
          )}
        </div>
      )}
      <label>
        <span>Recado para os noivos (opcional)</span>
        <textarea id={`rsvp-msg-${weddingId}`} name="message" maxLength={1000} rows={2} disabled={disabled} defaultValue={invitation?.guest.rsvp_message} />
      </label>
      <button className="s-btn" disabled={disabled || status === "sending"}>
        {status === "sending" ? "Enviando…" : "Enviar confirmação"}
      </button>
      {error && (
        <p className="s-err" role="alert">
          {error}
        </p>
      )}
      {disabled && <p className="s-muted small">Na prévia e na demonstração, os formulários ficam desativados.</p>}
    </form>
  );
}
