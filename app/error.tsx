"use client";

import ErrorState from "@/components/ErrorState";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap">
      <ErrorState error={error} reset={reset} backHref="/" backLabel="Ir para o início" />
    </main>
  );
}
