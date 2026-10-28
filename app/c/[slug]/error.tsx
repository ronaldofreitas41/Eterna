"use client";

import ErrorState from "@/components/ErrorState";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap">
      <ErrorState error={error} reset={reset} title="O site do casamento não carregou" />
    </main>
  );
}
