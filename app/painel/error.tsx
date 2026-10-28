"use client";

import ErrorState from "@/components/ErrorState";

export default function PainelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap">
      <ErrorState error={error} reset={reset} backHref="/" backLabel="Ir para o início" />
    </div>
  );
}
