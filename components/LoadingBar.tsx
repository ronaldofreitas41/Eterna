"use client";

import { useEffect, useRef, useState } from "react";

// Barra de carregamento no topo da tela, ligada a toda requisição feita pela página:
// navegação entre telas, ações do servidor (salvar, publicar, enviar fotos) e chamadas à IA.
// Ficam de fora a pré-busca de links e a consulta de sincronização, que acontecem em segundo plano.

const BACKGROUND = ["/api/revisao/"];
const SHOW_AFTER_MS = 120;

function isBackground(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (BACKGROUND.some((p) => url.includes(p))) return true;
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  return headers.get("Next-Router-Prefetch") === "1";
}

export default function LoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const active = useRef(0);
  const showTimer = useRef<number | undefined>(undefined);
  const trickle = useRef<number | undefined>(undefined);

  useEffect(() => {
    const original = window.fetch;

    const start = () => {
      active.current++;
      if (active.current > 1) return;
      window.clearTimeout(showTimer.current);
      showTimer.current = window.setTimeout(() => {
        setVisible(true);
        setProgress(12);
        window.clearInterval(trickle.current);
        // Avança cada vez mais devagar, sem nunca chegar ao fim antes da resposta.
        trickle.current = window.setInterval(() => setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p)), 200);
      }, SHOW_AFTER_MS);
    };

    const done = () => {
      active.current = Math.max(0, active.current - 1);
      if (active.current > 0) return;
      window.clearTimeout(showTimer.current);
      window.clearInterval(trickle.current);
      setProgress((p) => (p > 0 ? 100 : 0));
      window.setTimeout(() => {
        if (active.current === 0) {
          setVisible(false);
          setProgress(0);
        }
      }, 300);
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isBackground(input, init)) return original(input, init);
      start();
      try {
        return await original(input, init);
      } finally {
        done();
      }
    };
    return () => {
      window.fetch = original;
      window.clearTimeout(showTimer.current);
      window.clearInterval(trickle.current);
    };
  }, []);

  return (
    <div
      className={`loading-bar${visible ? " on" : ""}`}
      role="progressbar"
      aria-label="Carregando"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <span style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}
