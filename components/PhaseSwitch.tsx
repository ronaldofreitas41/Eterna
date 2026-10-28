"use client";

import type { SitePhase } from "@/lib/types";

const PHASES: { id: SitePhase; label: string }[] = [
  { id: "antes", label: "Antes" },
  { id: "durante", label: "Durante" },
  { id: "depois", label: "Depois" },
];

export default function PhaseSwitch({ value, onChange }: { value: SitePhase; onChange: (p: SitePhase) => void }) {
  return (
    <div className="seg" role="group" aria-label="Fase do casamento">
      {PHASES.map((p) => (
        <button key={p.id} type="button" aria-pressed={value === p.id} onClick={() => onChange(p.id)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
