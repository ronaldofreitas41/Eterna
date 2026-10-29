"use client";

import { useState } from "react";
import Link from "next/link";
import type { WorkspaceApi } from "./DesignWorkspace";
import EditorPanel from "./EditorPanel";
import StudioPanel from "./StudioPanel";
import CoverPicker from "./CoverPicker";
import type { RefView } from "./ReferenceUploader";
import type { StudioMessage } from "@/lib/types";

const TABS = [
  { id: "pedir", label: "Pedir mudança" },
  { id: "textos", label: "Textos" },
  { id: "aparencia", label: "Aparência" },
  { id: "secoes", label: "Seções" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Props = {
  api: WorkspaceApi;
  weddingId: string;
  refs: RefView[];
  messages: StudioMessage[];
  aiEnabled: boolean;
  coverUrl: string | null;
  initialTab?: Tab;
};

/** Painel de “Meu site”: pedir mudanças em palavras ou editar diretamente, um assunto por vez. */
export default function SitePanel({ api, weddingId, refs, messages, aiEnabled, coverUrl, initialTab = "pedir" }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <div className="site-panel">
      <div className="seg wide site-tabs" role="tablist" aria-label="Como editar">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "pedir" && <StudioPanel api={api} weddingId={weddingId} refs={refs} initialMessages={messages} aiEnabled={aiEnabled} />}
      {tab === "textos" && (
        <>
          <EditorPanel api={api} only="Textos" />
          <div className="side-panel pt0">
            <Link href={`/painel/${weddingId}/programacao`} className="btn ghost small">
              Programação, endereço e hospedagem
            </Link>
          </div>
        </>
      )}
      {tab === "aparencia" && (
        <>
          <div className="side-panel pb0">
            <CoverPicker weddingId={weddingId} coverUrl={coverUrl} />
          </div>
          <EditorPanel api={api} only="Visual" />
        </>
      )}
      {tab === "secoes" && <EditorPanel api={api} only="Componentes" />}
    </div>
  );
}
