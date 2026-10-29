"use client";

import { useEffect, useState } from "react";

// Campos de texto do editor. Por padrão, cada letra já aparece na prévia (o "desfazer" agrupa a digitação).
// Com live={false}, a alteração só é registrada ao sair do campo (para valores que precisam ser interpretados, como preços).

type TextProps = {
  id: string;
  label: string;
  value: string;
  onCommit: (v: string) => void;
  maxLength: number;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  type?: string;
  live?: boolean;
};

export function TextField({ id, label, value, onCommit, maxLength, multiline, rows = 4, placeholder, hint, type = "text", live = true }: TextProps) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  const commit = () => local !== value && onCommit(local);
  const change = (v: string) => {
    setLocal(v);
    if (live) onCommit(v);
  };
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea id={id} rows={rows} maxLength={maxLength} value={local} placeholder={placeholder} onChange={(e) => change(e.target.value)} onBlur={commit} />
      ) : (
        <input
          id={id}
          type={type}
          maxLength={maxLength}
          value={local}
          placeholder={placeholder}
          onChange={(e) => change(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {(Object.entries(options) as [T, string][]).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Grupo recolhível do editor: o essencial aberto, o resto à mão sem ocupar a tela. */
export function Fold({ title, hint, open, children }: { title: string; hint?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="fold" open={open}>
      <summary>
        <strong>{title}</strong>
        {hint && <span className="muted small">{hint}</span>}
      </summary>
      <div className="stack">{children}</div>
    </details>
  );
}

/** Lista editável de itens (linha do tempo, FAQ, presentes). */
export function ListEditor<T>({
  items,
  onChange,
  empty,
  make,
  render,
  addLabel,
  max,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  empty: string;
  make: () => T;
  render: (item: T, set: (v: T) => void, i: number) => React.ReactNode;
  addLabel: string;
  max: number;
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="list-editor">
      {items.length === 0 && <p className="muted small">{empty}</p>}
      {items.map((item, i) => (
        <div className="list-item" key={i}>
          {render(item, (v) => onChange(items.map((x, k) => (k === i ? v : x))), i)}
          <div className="list-item-actions">
            <button type="button" className="text-link small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima">
              Subir
            </button>
            <button type="button" className="text-link small" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Mover para baixo">
              Descer
            </button>
            <button type="button" className="text-link danger small" onClick={() => onChange(items.filter((_, k) => k !== i))}>
              Remover
            </button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="btn ghost small" onClick={() => onChange([...items, make()])}>
          {addLabel}
        </button>
      )}
    </div>
  );
}
