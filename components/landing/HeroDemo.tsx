"use client";

import { useRef, useState } from "react";
import WeddingSite from "@/components/site/WeddingSite";
import { PRESETS } from "@/lib/presets";
import type { SiteData } from "@/lib/site";

const TODAY = new Date(2027, 3, 15);
const CHOICES = [PRESETS[0], PRESETS[1], PRESETS[3], PRESETS[4], PRESETS[5]];

/** Demonstração da capa: escolher uma paleta muda a prévia no computador e no celular. */
export default function HeroDemo({ data }: { data: SiteData }) {
  const [presetId, setPresetId] = useState(CHOICES[0].id);
  const preset = CHOICES.find((p) => p.id === presetId) ?? CHOICES[0];
  const site = { ...data, design: { ...data.design, theme: preset.theme } };
  const devices = useRef<HTMLDivElement>(null);

  // Inclina os aparelhos em 3D acompanhando o mouse.
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = devices.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--tilt-x", `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
    el.style.setProperty("--tilt-y", `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
  };
  const untilt = () => {
    devices.current?.style.setProperty("--tilt-x", "0deg");
    devices.current?.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div className="l-hero-demo">
      <div className="l-devices" aria-hidden="true" ref={devices} onPointerMove={tilt} onPointerLeave={untilt}>
        <div className="l-desktop">
          <div className="l-bar">
            <i />
            <i />
            <i />
            <span>eterna.com.br/c/helena-e-rafael</span>
          </div>
          <div className="l-screen preview-scroll">
            <div className="l-scale desktop">
              <WeddingSite data={site} phase="antes" mode="demo" today={TODAY} />
            </div>
          </div>
        </div>
        <div className="l-phone">
          <div className="l-screen preview-scroll">
            <div className="l-scale phone">
              <WeddingSite data={site} phase="durante" mode="demo" today={new Date(2027, 4, 15)} />
            </div>
          </div>
        </div>
      </div>
      <div className="l-palettes">
        <span className="mono">Experimentem uma paleta</span>
        <div className="l-palette-btns" role="group" aria-label="Paleta da prévia">
          {CHOICES.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === presetId} onClick={() => setPresetId(p.id)} title={p.description}>
              <span className="mini-swatch">
                {[p.theme.palette.background, p.theme.palette.accent, p.theme.palette.ink].map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
