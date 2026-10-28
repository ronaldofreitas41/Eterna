"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WeddingSite from "@/components/site/WeddingSite";
import PhaseSwitch from "@/components/PhaseSwitch";
import { SiteDesign, parseDesign, sameDesign } from "@/lib/design";
import { resolvePhase } from "@/lib/phase";
import type { SiteData } from "@/lib/site";
import { publishSite, saveDraft, saveVersion as saveVersionAction, unpublishSite, type VersionRow } from "@/app/painel/acoes/design";
import type { SitePhase, Wedding } from "@/lib/types";
import VersionsPanel from "./VersionsPanel";

export type { VersionRow };

export type WorkspaceApi = {
  design: SiteDesign;
  update: (next: SiteDesign | ((d: SiteDesign) => SiteDesign)) => void;
  undo: () => boolean;
  preview: (design: SiteDesign | null, label?: string) => void;
  saveVersion: (label: string, source: VersionRow["source"], design?: SiteDesign) => Promise<boolean>;
  notify: (text: string, ok?: boolean) => void;
};

type Props = {
  wedding: Wedding;
  initialDesign: SiteDesign;
  initialVersions: VersionRow[];
  live: Omit<SiteData, "wedding" | "design" | "invitation">;
  children: (api: WorkspaceApi) => React.ReactNode;
};

const HISTORY_LIMIT = 50;

export default function DesignWorkspace({ wedding, initialDesign, initialVersions, live, children }: Props) {
  const router = useRouter();
  const [design, setDesign] = useState(initialDesign);
  const [past, setPast] = useState<SiteDesign[]>([]);
  const [future, setFuture] = useState<SiteDesign[]>([]);
  const [saved, setSaved] = useState(initialDesign);
  const [versions, setVersions] = useState(initialVersions);
  const [published, setPublished] = useState(wedding.published);
  const [publishedId, setPublishedId] = useState(wedding.published_version_id);
  const [override, setOverride] = useState<{ design: SiteDesign; label: string } | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [phase, setPhase] = useState<SitePhase>(() => resolvePhase(wedding.phase, wedding.wedding_date));
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [showVersions, setShowVersions] = useState(false);

  const dirty = !sameDesign(design, saved);
  const [remote, setRemote] = useState<SiteDesign | null>(null);
  const lastServer = useRef(initialDesign);

  // Dados novos do servidor (alteração feita em outro aparelho ou aba, trazida pelo LiveSync).
  useEffect(() => {
    if (sameDesign(initialDesign, lastServer.current)) return;
    lastServer.current = initialDesign;
    if (sameDesign(initialDesign, saved)) return; // é o próprio salvamento desta tela
    if (dirty) {
      setRemote(initialDesign); // não sobrescreve o que está sendo editado aqui
    } else {
      setDesign(initialDesign);
      setSaved(initialDesign);
      setPast([]);
      setFuture([]);
      notify("O design foi atualizado com alterações feitas em outro aparelho.");
    }
    // Só reage a mudanças vindas do servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDesign]);
  useEffect(() => setVersions(initialVersions), [initialVersions]);
  useEffect(() => {
    setPublished(wedding.published);
    setPublishedId(wedding.published_version_id);
  }, [wedding.published, wedding.published_version_id]);
  const publishedSnapshot = versions.find((v) => v.id === publishedId)?.snapshot;
  const differsFromPublished = published && publishedSnapshot !== undefined && !sameDesign(design, parseDesign(publishedSnapshot));

  const notify = useCallback((text: string, ok = true) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 4000);
  }, []);

  const update: WorkspaceApi["update"] = useCallback(
    (next) => {
      const value = typeof next === "function" ? next(design) : next;
      setOverride(null);
      if (sameDesign(value, design)) return;
      setPast((p) => [...p.slice(-HISTORY_LIMIT + 1), design]);
      setFuture([]);
      setDesign(value);
    },
    [design],
  );

  const undo = useCallback(() => {
    if (!past.length) return false;
    setFuture((f) => [design, ...f]);
    setDesign(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    return true;
  }, [past, design]);

  const redo = useCallback(() => {
    if (!future.length) return;
    setPast((p) => [...p, design]);
    setDesign(future[0]);
    setFuture((f) => f.slice(1));
  }, [future, design]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function onSave() {
    setBusy("save");
    const res = await saveDraft(wedding.id, design);
    setBusy(null);
    if (!res.ok) return notify(res.error, false);
    setSaved(design);
    notify("Rascunho salvo. O site público só muda quando vocês publicarem.");
  }

  const saveVersion: WorkspaceApi["saveVersion"] = async (label, source, d = design) => {
    const res = await saveVersionAction(wedding.id, label, source, d);
    if (!res.ok) {
      notify(res.error, false);
      return false;
    }
    setVersions((v) => [res.data, ...v]);
    return true;
  };

  async function onPublish() {
    setBusy("publish");
    const res = await publishSite(wedding.id, design);
    setBusy(null);
    if (!res.ok) return notify(res.error, false);
    setSaved(design);
    setVersions((v) => [res.data, ...v]);
    setPublished(true);
    setPublishedId(res.data.id);
    notify(`Site publicado em /c/${wedding.slug}.`);
    router.refresh();
  }

  async function onUnpublish() {
    setBusy("unpublish");
    const res = await unpublishSite(wedding.id);
    setBusy(null);
    if (!res.ok) return notify(res.error, false);
    setPublished(false);
    notify("Site despublicado. Os convidados verão a mensagem de site indisponível.");
    router.refresh();
  }

  function restore(v: VersionRow) {
    update(parseDesign(v.snapshot));
    setShowVersions(false);
    notify("Versão restaurada na prévia. Salvem o rascunho para manter ou publiquem para os convidados verem.");
  }

  const api: WorkspaceApi = {
    design,
    update,
    undo,
    preview: (d, label = "Proposta") => setOverride(d ? { design: d, label } : null),
    saveVersion,
    notify,
  };

  const shown = override?.design ?? design;

  return (
    <div className="workspace">
      <div className="ws-toolbar" role="toolbar" aria-label="Ações do site">
        <div className="ws-group">
          <button type="button" className="btn ghost small" onClick={undo} disabled={!past.length} title="Desfazer (Ctrl+Z)">
            Desfazer
          </button>
          <button type="button" className="btn ghost small" onClick={redo} disabled={!future.length} title="Refazer (Ctrl+Shift+Z)">
            Refazer
          </button>
          <button type="button" className="btn ghost small" aria-expanded={showVersions} onClick={() => setShowVersions((s) => !s)}>
            Versões
          </button>
        </div>
        <div className="ws-group">
          <div className="seg" role="group" aria-label="Dispositivo da prévia">
            <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
              Computador
            </button>
            <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
              Celular
            </button>
          </div>
          <PhaseSwitch value={phase} onChange={setPhase} />
        </div>
        <div className="ws-group">
          <span className={`ws-status${dirty ? " dirty" : ""}`} aria-live="polite">
            {dirty ? "Alterações não salvas" : differsFromPublished ? "Rascunho salvo, ainda não publicado" : published ? "Publicado" : "Rascunho salvo"}
          </span>
          <button type="button" className="btn ghost small" onClick={onSave} disabled={!dirty || busy !== null}>
            {busy === "save" ? "Salvando…" : "Salvar rascunho"}
          </button>
          <button type="button" className="btn primary small" onClick={onPublish} disabled={busy !== null || (published && !dirty && !differsFromPublished)}>
            {busy === "publish" ? "Publicando…" : published ? "Atualizar site publicado" : "Publicar"}
          </button>
          {published && (
            <button type="button" className="text-link small" onClick={onUnpublish} disabled={busy !== null}>
              Despublicar
            </button>
          )}
        </div>
      </div>

      <div className="ws-body">
        <div className="ws-side">
          {showVersions ? (
            <VersionsPanel
              versions={versions}
              publishedId={publishedId}
              onRestore={restore}
              onSaveCurrent={async (label) => {
                if (await saveVersion(label || "Versão salva", "manual")) notify("Versão salva.");
              }}
              onClose={() => setShowVersions(false)}
            />
          ) : (
            children(api)
          )}
        </div>
        <div className="ws-preview">
          {remote && (
            <div className="ws-override" role="alert">
              <span>O rascunho foi alterado em outro aparelho enquanto vocês editavam aqui.</span>
              <span className="row-actions">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    update(remote);
                    setSaved(remote);
                    setRemote(null);
                  }}
                >
                  Carregar a versão do outro aparelho
                </button>
                <button type="button" className="text-link" onClick={() => setRemote(null)}>
                  Manter as minhas alterações
                </button>
              </span>
            </div>
          )}
          {override && (
            <div className="ws-override" role="status">
              <span>
                Vendo a proposta <strong>{override.label}</strong>. Nada foi aplicado ainda.
              </span>
              <button type="button" className="text-link" onClick={() => setOverride(null)}>
                Voltar ao design atual
              </button>
            </div>
          )}
          <div className={`device device-${device} preview-scroll`} tabIndex={0} aria-label="Prévia do site">
            <WeddingSite data={{ ...live, wedding, design: shown, invitation: null }} phase={phase} mode="preview" today={new Date()} />
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast${toast.ok ? "" : " error"}`} role={toast.ok ? "status" : "alert"}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
