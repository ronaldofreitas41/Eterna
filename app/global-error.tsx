"use client";

// Último recurso: erro no próprio layout raiz. Não usa os estilos do app (eles podem não ter carregado).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FBF8F2", color: "#22201C" }}>
        <main style={{ maxWidth: 520, margin: "18vh auto", padding: "0 20px", display: "grid", gap: 16 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Não foi possível carregar a Eterna</h1>
          <p>Pode ser uma instabilidade momentânea. Nada do que vocês salvaram foi perdido.</p>
          <button
            type="button"
            onClick={reset}
            style={{ justifySelf: "start", padding: "12px 20px", borderRadius: 999, border: 0, background: "#22201C", color: "#FBF8F2", cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
