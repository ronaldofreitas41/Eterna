"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Tela de erro amigável com nova tentativa. Usada pelos error.tsx das rotas. */
export default function ErrorState({
  error,
  reset,
  title = "Não foi possível carregar esta página",
  backHref,
  backLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-state" role="alert">
      <span className="mono">Algo deu errado</span>
      <h1>{title}</h1>
      <p className="lede">
        Pode ser uma instabilidade momentânea na conexão ou no servidor. Nada do que vocês já salvaram foi perdido.
      </p>
      <div className="row-actions">
        <button
          type="button"
          className="btn primary"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            reset();
            window.setTimeout(() => setRetrying(false), 1500);
          }}
        >
          {retrying ? "Tentando…" : "Tentar de novo"}
        </button>
        {backHref && (
          <Link href={backHref} className="btn ghost">
            {backLabel ?? "Voltar"}
          </Link>
        )}
      </div>
      {error.digest && <p className="muted small">Código para o suporte: {error.digest}</p>}
    </div>
  );
}
