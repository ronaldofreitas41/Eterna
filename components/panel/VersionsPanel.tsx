"use client";

import { useState } from "react";
import type { VersionRow } from "./DesignWorkspace";

const SOURCE: Record<VersionRow["source"], string> = {
  manual: "Salva por vocês",
  estudio: "Estúdio criativo",
  publicacao: "Publicação",
  restauracao: "Restauração",
};

type Props = {
  versions: VersionRow[];
  publishedId: string | null;
  onRestore: (v: VersionRow) => void;
  onSaveCurrent: (label: string) => void;
  onClose: () => void;
};

export default function VersionsPanel({ versions, publishedId, onRestore, onSaveCurrent, onClose }: Props) {
  const [label, setLabel] = useState("");
  return (
    <div className="side-panel">
      <div className="card-head">
        <h2>Versões</h2>
        <button type="button" className="text-link" onClick={onClose}>
          Fechar
        </button>
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSaveCurrent(label.trim());
          setLabel("");
        }}
      >
        <input id="version-label" aria-label="Nome da versão" placeholder="Nome desta versão (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
        <button className="btn ghost small">Salvar versão atual</button>
      </form>
      {versions.length === 0 ? (
        <p className="muted small">Nenhuma versão ainda. Elas são criadas ao publicar, ao aplicar uma proposta do estúdio ou quando vocês salvam.</p>
      ) : (
        <ol className="version-list">
          {versions.map((v) => (
            <li key={v.id}>
              <div>
                <strong>{v.label || SOURCE[v.source]}</strong>
                <span className="mono">
                  {SOURCE[v.source]} · {new Date(v.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                {v.id === publishedId && <span className="chip ok">No ar</span>}
              </div>
              <button type="button" className="btn ghost small" onClick={() => onRestore(v)}>
                Restaurar
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
