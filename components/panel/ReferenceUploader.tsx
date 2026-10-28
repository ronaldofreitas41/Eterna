"use client";

import { useEffect, useState } from "react";
import { addReferenceUrl, deleteReference, updateReferenceNote, uploadReference, type RefView } from "@/app/painel/acoes/estudio";
import { extractPalette } from "@/lib/palette-extract";
import type { ReferencePalette } from "@/lib/studio";
import type { Palette } from "@/lib/theme";
import { prepareImage } from "@/components/site/upload";
import { useServerState } from "@/components/useServerState";

export type { RefView };

type Props = {
  weddingId: string;
  initial: RefView[];
  onPalettes?: (p: ReferencePalette[]) => void;
  onUsePalette?: (p: Palette, index: number) => void;
};

const MAX_REFS = 8;

export default function ReferenceUploader({ weddingId, initial, onPalettes, onUsePalette }: Props) {
  const [refs, setRefs] = useServerState(initial);
  const [palettes, setPalettes] = useState<Record<string, Palette | null>>({});
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Lê as cores de cada imagem no navegador (para o modo demonstrativo e para “usar estas cores”).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, Palette | null> = {};
      for (const r of refs) out[r.id] = r.displayUrl ? await extractPalette(r.displayUrl) : null;
      if (cancelled) return;
      setPalettes(out);
      onPalettes?.(refs.flatMap((r, i) => (out[r.id] ? [{ index: i + 1, palette: out[r.id]! }] : [])));
    })();
    return () => {
      cancelled = true;
    };
    // onPalettes muda a cada render do pai; as cores só dependem das imagens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, MAX_REFS - refs.length);
    if (!list.length) return setMsg({ ok: false, text: `Vocês podem ter até ${MAX_REFS} referências.` });
    setBusy(true);
    setMsg(null);
    const added: RefView[] = [];
    const errors: string[] = [];
    for (const file of list) {
      try {
        const body = new FormData();
        body.set("weddingId", weddingId);
        body.set("file", await prepareImage(file));
        const res = await uploadReference(body);
        if (res.ok) added.push(res.data);
        else errors.push(res.error);
      } catch (err) {
        errors.push((err as Error).message);
      }
    }
    setRefs((r) => [...r, ...added]);
    setBusy(false);
    if (errors.length) setMsg({ ok: false, text: errors.join(" ") });
    else setMsg({ ok: true, text: added.length === 1 ? "Referência adicionada." : `${added.length} referências adicionadas.` });
  }

  async function addUrl(e: React.FormEvent) {
    e.preventDefault();
    const res = await addReferenceUrl(weddingId, urlInput);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    setRefs((r) => [...r, res.data]);
    setUrlInput("");
    setMsg({ ok: true, text: "Link adicionado. A IA lê a imagem direto do endereço; ele precisa ser uma imagem pública." });
  }

  async function saveNote(id: string, note: string) {
    const res = await updateReferenceNote(weddingId, id, note);
    if (!res.ok) setMsg({ ok: false, text: res.error });
    else setRefs((list) => list.map((r) => (r.id === id ? { ...r, note } : r)));
  }

  async function remove(r: RefView) {
    const res = await deleteReference(weddingId, r.id);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    setRefs((list) => list.filter((x) => x.id !== r.id));
    setMsg({ ok: true, text: "Referência removida." });
  }

  return (
    <div className="refs">
      {refs.length > 0 && (
        <ol className="ref-list">
          {refs.map((r, i) => (
            <li key={r.id} className="ref-item">
              <span className="ref-n">{i + 1}</span>
              {r.displayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.displayUrl} alt={`Referência ${i + 1}`} />
              ) : (
                <span className="ref-ph" />
              )}
              <div className="ref-body">
                <input
                  id={`ref-note-${r.id}`}
                  aria-label={`Nota da referência ${i + 1}`}
                  defaultValue={r.note}
                  maxLength={300}
                  placeholder="O que vocês gostam nesta imagem?"
                  onBlur={(e) => e.target.value !== r.note && saveNote(r.id, e.target.value)}
                />
                <div className="ref-actions">
                  {palettes[r.id] && (
                    <span className="mini-swatch" aria-label="Cores extraídas">
                      {Object.values(palettes[r.id]!).map((c, k) => (
                        <i key={k} style={{ background: c }} />
                      ))}
                    </span>
                  )}
                  {palettes[r.id] && onUsePalette && (
                    <button type="button" className="text-link" onClick={() => onUsePalette(palettes[r.id]!, i + 1)}>
                      Usar estas cores
                    </button>
                  )}
                  <button type="button" className="text-link danger" onClick={() => remove(r)}>
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <label className={`drop${busy ? " busy" : ""}`}>
        <input id={`ref-files-${weddingId}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => addFiles(e.target.files)} disabled={busy} />
        <strong>{busy ? "Enviando…" : "Enviar imagens do dispositivo"}</strong>
        <span>JPG, PNG, WEBP ou GIF. Pinterest, Instagram ou fotos do celular.</span>
      </label>
      <form className="inline-form" onSubmit={addUrl}>
        <input
          id={`ref-url-${weddingId}`}
          aria-label="Endereço de uma imagem de referência"
          type="url"
          placeholder="Ou colem o link de uma imagem (https://…)"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <button className="btn ghost small">Adicionar link</button>
      </form>
      {msg && (
        <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
