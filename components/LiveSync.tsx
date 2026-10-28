"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantém a tela atualizada com mudanças feitas em outro aparelho ou aba.
 * Consulta o número de revisão do casamento enquanto a aba está visível (e ao voltar para ela);
 * quando muda, recarrega os dados do servidor sem recarregar a página.
 * Se a pessoa estiver digitando, espera ela sair do campo.
 */
export default function LiveSync({ weddingId, revision, intervalMs = 5000 }: { weddingId: string; revision: number; intervalMs?: number }) {
  const router = useRouter();
  const known = useRef(revision);
  const pending = useRef(false);

  useEffect(() => {
    known.current = Math.max(known.current, revision);
  }, [revision]);

  useEffect(() => {
    let stopped = false;
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
    };
    const refreshIfIdle = () => {
      if (!pending.current || typing()) return;
      pending.current = false;
      router.refresh();
    };
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/revisao/${weddingId}`, { cache: "no-store" });
        if (!res.ok) return;
        const { revision: latest } = (await res.json()) as { revision: number };
        if (latest > known.current) {
          known.current = latest;
          pending.current = true;
        }
      } catch {
        // Sem conexão: tenta de novo no próximo ciclo.
      }
      refreshIfIdle();
    };
    const timer = window.setInterval(check, intervalMs);
    const onVisible = () => document.visibilityState === "visible" && check();
    // O foco só sai do campo depois do evento: espera um instante para conferir.
    const onFocusOut = () => window.setTimeout(refreshIfIdle, 50);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [weddingId, intervalMs, router]);

  return null;
}
