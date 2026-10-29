"use client";

import { useState } from "react";

/** Copia um link do site (com o endereço atual) e confirma na própria tela. */
export default function CopyLinkButton({ path, label, className = "btn ghost small" }: { path: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const link = `${location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(link);
      setDone(true);
      window.setTimeout(() => setDone(false), 2500);
    } catch {
      window.prompt("Copiem o link:", link);
    }
  }
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {done ? "Link copiado!" : label}
    </button>
  );
}
