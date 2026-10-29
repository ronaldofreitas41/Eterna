"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { formatBRL } from "@/lib/design";
import { pixPayload, type PixSettings } from "@/lib/pix";

/** Presentear com Pix: QR Code e "Copia e Cola" com o valor do presente, direto para a conta dos noivos. */
export default function GiftPix({ pix, amountCents, title, label = "Presentear com Pix" }: { pix: PixSettings; amountCents: number | null; title: string; label?: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = pixPayload(pix, amountCents, title);
  if (!code) return null;

  async function toggle() {
    setOpen((o) => !o);
    if (!qr) setQr(await QRCode.toString(code!, { type: "svg", margin: 1, width: 200, color: { dark: "#000000", light: "#FFFFFF" } }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code!);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt("Copie o código Pix:", code!);
    }
  }

  return (
    <div className="s-pix">
      <button type="button" className="s-btn" aria-expanded={open} onClick={toggle}>
        {label}
      </button>
      {open && (
        <div className="s-pix-box" role="region" aria-label={`Pix para ${title || "os noivos"}`}>
          {qr && <div className="s-pix-qr" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR Code do Pix" />}
          <p className="s-muted">
            {amountCents ? `Valor: ${formatBRL(amountCents)}. ` : "Você escolhe o valor no app do banco. "}
            Abra o app do seu banco, escolha Pix e leia o QR Code ou use o Copia e Cola.
          </p>
          <button type="button" className="s-link" onClick={copy}>
            {copied ? "Código copiado!" : "Copiar código Pix"}
          </button>
          <p className="s-muted small">Recebe: {pix.name}</p>
        </div>
      )}
    </div>
  );
}
