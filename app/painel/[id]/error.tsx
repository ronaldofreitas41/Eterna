"use client";

import ErrorState from "@/components/ErrorState";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <ErrorState error={error} reset={reset} backHref="/painel" backLabel="Voltar para os casamentos" />
    </div>
  );
}
