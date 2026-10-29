"use client";

import { useState } from "react";
import ContributionForm from "@/components/site/ContributionForm";
import PhotoUpload from "@/components/site/PhotoUpload";
import type { SiteCampaign } from "@/lib/site";

const KIND_HINT: Record<string, string> = { memory: "Uma lembrança", photo: "Uma foto antiga", advice: "Um conselho", capsule: "Para o futuro", story: "Uma história" };

/** Escolha simples: um botão por forma de contribuir; ao tocar, abre só o formulário escolhido. */
export default function GuestContribute({ weddingId, campaigns, token }: { weddingId: string; campaigns: SiteCampaign[]; token: string | null }) {
  const [choice, setChoice] = useState<string | null>(null);

  const options = [
    { id: "fotos", title: "Enviar fotos da festa", hint: "Fotos de hoje, direto do celular." },
    ...campaigns.map((c) => ({ id: c.id, title: c.title, hint: KIND_HINT[c.kind] ?? "" })),
    { id: "mensagem", title: "Deixar uma mensagem", hint: "Um recado carinhoso para o casal." },
  ];

  if (choice) {
    const campaign = campaigns.find((c) => c.id === choice) ?? null;
    return (
      <section className="s-section guest-form">
        <button type="button" className="s-link" onClick={() => setChoice(null)}>
          ← Escolher outra forma
        </button>
        <h2>{options.find((o) => o.id === choice)?.title}</h2>
        {campaign?.prompt && <p className="s-muted">{campaign.prompt}</p>}
        {choice === "fotos" ? (
          <PhotoUpload weddingId={weddingId} disabled={false} />
        ) : (
          <ContributionForm weddingId={weddingId} campaign={campaign} token={token} disabled={false} />
        )}
      </section>
    );
  }

  return (
    <section className="s-section guest-choices" aria-label="Como vocês querem contribuir">
      {options.map((o) => (
        <button key={o.id} type="button" className="guest-choice" onClick={() => setChoice(o.id)}>
          <strong>{o.title}</strong>
          {o.hint && <span>{o.hint}</span>}
        </button>
      ))}
    </section>
  );
}
