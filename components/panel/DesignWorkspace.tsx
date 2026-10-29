"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WeddingSite from "@/components/site/WeddingSite";
import { SiteDesign, parseDesign, sameDesign } from "@/lib/design";
import { PHASE_NAMES, resolvePhase } from "@/lib/phase";
import type { SiteData } from "@/lib/site";
import { updateSettings } from "@/app/painel/acoes/configuracoes";
import { publishSite, saveDraft, saveVersion as saveVersionAction, unpublishSite, type VersionRow } from "@/app/painel/acoes/design";
import type { SitePhase, Wedding } from "@/lib/types";
import VersionsPanel from "./VersionsPanel";

export type { VersionRow };

/** Dados do casamento editáveis junto com o site (vão direto para o casamento, sem precisar publicar). */
export type WeddingInfo = Pick<Wedding, "partner_one" | "partner_two" | "wedding_date" | "venue" | "city">;
const pickInfo = (w: WeddingInfo): WeddingInfo => ({
  partner_one: w.partner_one,
  partner_two: w.partner_two,
  wedding_date: w.wedding_date,
  venue: w.venue,
  city: w.city,
});
const sameInfo = (a: WeddingInfo, b: WeddingInfo) => JSON.stringify(pickInfo(a)) === JSON.stringify(pickInfo(b));

export type WorkspaceApi = {
  design: SiteDesign;
  info: WeddingInfo;
  setInfo: (patch: Partial<WeddingInfo>) => void;
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
// Alterações seguidas com menos que isso de intervalo (a digitação de um texto) viram um único passo do "desfazer".
const TYPING_MERGE_MS = 900;

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
  // No celular, uma coisa por vez: editar ou ver o site.
  const [pane, setPane] = useState<"editar" | "previa">("editar");
  const naturalPhase = resolvePhase(wedding.phase, wedding.wedding_date);
  const [phase, setPhase] = useState<SitePhase>(naturalPhase);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  // Rascunhos salvos por esta tela: quando o servidor devolve um deles, não é alteração de outro aparelho.
  const ownSaves = useRef<string[]>([JSON.stringify(initialDesign)]);
  const lastEdit = useRef(0);
  const [info, setInfoState] = useState<WeddingInfo>(() => pickInfo(wedding));
  const [savedInfo, setSavedInfo] = useState<WeddingInfo>(() => pickInfo(wedding));
  const [infoSaving, setInfoSaving] = useState(false);
  const infoDirty = !sameInfo(info, savedInfo);
  const namesMissing = !info.partner_one.trim() || !info.partner_two.trim();

  const dirty = !sameDesign(design, saved);
  const [remote, setRemote] = useState<SiteDesign | null>(null);
  const lastServer = useRef(initialDesign);

  // Dados novos do servidor (alteração feita em outro aparelho ou aba, trazida pelo LiveSync).
  useEffect(() => {
    if (sameDesign(initialDesign, lastServer.current)) return;
    lastServer.current = initialDesign;
    if (ownSaves.current.includes(JSON.stringify(initialDesign))) return; // é um salvamento desta tela
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
  useEffect(() => {
    setVersions(initialVersions);
  }, [initialVersions]);
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
      const now = Date.now();
      if (now - lastEdit.current > TYPING_MERGE_MS) setPast((p) => [...p.slice(-HISTORY_LIMIT + 1), design]);
      lastEdit.current = now;
      setFuture([]);
      setDesign(value);
    },
    [design],
  );

  const undo = useCallback(() => {
    if (!past.length) return false;
    lastEdit.current = 0;
    setFuture((f) => [design, ...f]);
    setDesign(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    return true;
  }, [past, design]);

  const redo = useCallback(() => {
    if (!future.length) return;
    lastEdit.current = 0;
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
    if (!dirty && !infoDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, infoDirty]);

  // Salvamento automático do rascunho, um instante depois da última alteração.
  async function persist(snapshot: SiteDesign) {
    setSaveState("saving");
    const res = await saveDraft(wedding.id, snapshot);
    if (!res.ok) return setSaveState("error");
    ownSaves.current = [...ownSaves.current.slice(-9), JSON.stringify(snapshot)];
    setSaved(snapshot);
    setSaveState("saved");
  }
  useEffect(() => {
    if (!dirty || remote) return;
    const t = window.setTimeout(() => persist(design), 1200);
    return () => window.clearTimeout(t);
    // persist muda a cada render; o que importa é o design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, dirty, remote]);

  // Dados do casamento: salvos sozinhos, como o rascunho. Mudanças vindas de outro aparelho só entram se nada estiver pendente aqui.
  useEffect(() => {
    const server = pickInfo(wedding);
    if (sameInfo(server, savedInfo)) return;
    if (!infoDirty) setInfoState(server);
    setSavedInfo(server);
    // Só reage a mudanças vindas do servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding.partner_one, wedding.partner_two, wedding.wedding_date, wedding.venue, wedding.city]);
  useEffect(() => {
    if (!infoDirty || namesMissing) return;
    const snapshot = info;
    const t = window.setTimeout(async () => {
      setInfoSaving(true);
      const res = await updateSettings(wedding.id, snapshot);
      setInfoSaving(false);
      if (!res.ok) return notify(res.error, false);
      setSavedInfo(snapshot);
    }, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  async function share() {
    const link = `${location.origin}/c/${wedding.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      notify("Link do site copiado. É só colar na conversa com os convidados.");
    } catch {
      window.prompt("Copiem o link do site:", link);
    }
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
    ownSaves.current = [...ownSaves.current.slice(-9), JSON.stringify(design)];
    setSaved(design);
    setVersions((v) => [res.data, ...v]);
    setPublished(true);
    setPublishedId(res.data.id);
    notify(published ? "Site atualizado. Os convidados já veem as mudanças." : "Site publicado! Agora é só compartilhar o link.");
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
    notify("Versão restaurada. Publiquem quando quiserem que os convidados vejam.");
  }

  const api: WorkspaceApi = {
    design,
    info,
    setInfo: (patch) => setInfoState((i) => ({ ...i, ...patch })),
    update,
    undo,
    preview: (d, label = "Proposta") => {
      setOverride(d ? { design: d, label } : null);
      if (d) setPane("previa");
    },
    saveVersion,
    notify,
  };

  const shown = override?.design ?? design;

  return (
    <div className="workspace">
      <div className="seg wide pane-switch" role="group" aria-label="Mostrar">
        <button type="button" aria-pressed={pane === "editar"} onClick={() => setPane("editar")}>
          Editar
        </button>
        <button type="button" aria-pressed={pane === "previa"} onClick={() => setPane("previa")}>
          Ver o site
        </button>
      </div>
      <div className="ws-toolbar" role="toolbar" aria-label="Ações do site">
        <div className="ws-group">
          <button type="button" className="btn ghost small" onClick={undo} disabled={!past.length} title="Desfazer (Ctrl+Z)">
            Desfazer
          </button>
          <button type="button" className="btn ghost small" onClick={redo} disabled={!future.length} title="Refazer (Ctrl+Shift+Z)">
            Refazer
          </button>
        </div>
        <div className="ws-group ws-view">
          <div className="seg" role="group" aria-label="Ver no">
            <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
              Computador
            </button>
            <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
              Celular
            </button>
          </div>
        </div>
        <div className="ws-group">
          <span className={`ws-status ${saveState === "error" ? "dirty" : ""}`} aria-live="polite">
            {saveState === "error" ? (
              <button type="button" className="text-link danger small" onClick={() => persist(design)}>
                Não foi possível salvar. Tentar de novo
              </button>
            ) : namesMissing ? (
              "Escrevam os dois nomes para salvar"
            ) : saveState === "saving" || dirty || infoDirty || infoSaving ? (
              "Salvando…"
            ) : differsFromPublished ? (
              "Salvo · mudanças ainda não publicadas"
            ) : (
              "Tudo salvo"
            )}
          </span>
          <button type="button" className="btn primary small" onClick={onPublish} disabled={busy !== null || (published && !dirty && !differsFromPublished)}>
            {busy === "publish" ? "Publicando…" : published ? "Atualizar o site" : "Publicar"}
          </button>
          {published && (
            <button type="button" className="btn ghost small" onClick={share}>
              Compartilhar
            </button>
          )}
          <details className="more-menu">
            <summary className="btn ghost small">Mais</summary>
            <div className="more-menu-list">
              <span className="more-menu-label">Ver como o site fica</span>
              {(Object.keys(PHASE_NAMES) as SitePhase[]).map((p) => (
                <button key={p} type="button" aria-pressed={phase === p} onClick={() => setPhase(p)}>
                  {p === "antes" ? "Antes do casamento" : p === "durante" ? "No dia do casamento" : "Depois do casamento"}
                  {p === naturalPhase && <small className="muted"> · hoje</small>}
                </button>
              ))}
              <hr />
              <button type="button" onClick={() => setShowVersions((v) => !v)}>
                {showVersions ? "Fechar versões" : "Versões anteriores"}
              </button>
              {published && (
                <a href={`/c/${wedding.slug}`} target="_blank" rel="noopener noreferrer">
                  Abrir o site publicado
                </a>
              )}
              {published && (
                <button type="button" className="danger" onClick={onUnpublish} disabled={busy !== null}>
                  Tirar o site do ar
                </button>
              )}
            </div>
          </details>
        </div>
      </div>

      <div className={`ws-body pane-${pane}`}>
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
          {phase !== naturalPhase && !override && (
            <div className="ws-override" role="status">
              <span>
                Vendo o site <strong>{phase === "durante" ? "no dia do casamento" : phase === "depois" ? "depois do casamento" : "antes do casamento"}</strong>.
                Os convidados veem a versão de hoje.
              </span>
              <button type="button" className="text-link" onClick={() => setPhase(naturalPhase)}>
                Voltar para hoje
              </button>
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
            <WeddingSite data={{ ...live, wedding: { ...wedding, ...info }, design: shown, invitation: null }} phase={phase} mode="preview" today={new Date()} />
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
