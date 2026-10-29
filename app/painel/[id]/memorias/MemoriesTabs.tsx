"use client";

import { useState } from "react";

type Tab = "mensagens" | "fotos";

/** Duas abas: mensagens e histórias, e fotos da galeria. As duas ficam montadas para não perder o que está aberto. */
export default function MemoriesTabs({
  initial,
  pending,
  messages,
  photos,
}: {
  initial: Tab;
  pending: Record<Tab, number>;
  messages: React.ReactNode;
  photos: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(initial);
  return (
    <div className="stack-lg">
      <div className="seg wide" role="tablist" aria-label="Memórias">
        {(["mensagens", "fotos"] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === "mensagens" ? "Mensagens e histórias" : "Fotos"}
            {pending[t] > 0 && <span className="badge">{pending[t]}</span>}
          </button>
        ))}
      </div>
      <div hidden={tab !== "mensagens"}>{messages}</div>
      <div hidden={tab !== "fotos"}>{photos}</div>
    </div>
  );
}
