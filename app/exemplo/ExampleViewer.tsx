"use client";

import { useState } from "react";
import WeddingSite from "@/components/site/WeddingSite";
import PhaseSwitch from "@/components/PhaseSwitch";
import type { SiteData } from "@/lib/site";
import type { SitePhase } from "@/lib/types";

// Data fixa da demonstração: um mês antes do casamento fictício, e o próprio dia na fase "durante".
const DEMO_TODAY: Record<SitePhase, Date> = {
  antes: new Date(2027, 3, 15),
  durante: new Date(2027, 4, 15),
  depois: new Date(2027, 5, 20),
};

export default function ExampleViewer({ data }: { data: SiteData }) {
  const [phase, setPhase] = useState<SitePhase>("antes");
  return (
    <>
      <div className="example-phase">
        <span className="mono">Ver o site</span>
        <PhaseSwitch value={phase} onChange={setPhase} />
      </div>
      <WeddingSite data={data} phase={phase} mode="demo" today={DEMO_TODAY[phase]} />
    </>
  );
}
