"use client";

import { useState } from "react";
import type { Content, FaqEntry, Gift, TimelineEntry } from "@/lib/design";
import { PRESETS } from "@/lib/presets";
import { SECTIONS, moveSection } from "@/lib/sections";
import {
  BODY_FONTS,
  BUTTON_STYLES,
  DISPLAY_FONTS,
  LAYOUTS,
  NAV_STYLES,
  ORNAMENTS,
  Palette,
  contrastWarnings,
} from "@/lib/theme";
import type { WorkspaceApi } from "./DesignWorkspace";
import { Fold, ListEditor, SelectField, TextField } from "./fields";

const TABS = ["Componentes", "Visual", "Textos"] as const;
const PALETTE_LABELS: Record<keyof Palette, string> = {
  background: "Fundo",
  surface: "Blocos",
  ink: "Texto",
  muted: "Texto secundário",
  accent: "Destaque",
};

export type EditorTab = (typeof TABS)[number];

/** Com `only`, mostra uma única aba (a escolha fica com quem usa o painel). `extras` entra no grupo de cerimônia e recepção. */
export default function EditorPanel({ api, only, extras }: { api: WorkspaceApi; only?: EditorTab; extras?: React.ReactNode }) {
  const [chosen, setTab] = useState<EditorTab>("Componentes");
  const tab = only ?? chosen;
  const { design, update, info, setInfo } = api;
  const { theme, content } = design;
  const setTheme = (patch: Partial<typeof theme>) => update((d) => ({ ...d, theme: { ...d.theme, ...patch } }));
  const setContent = <K extends keyof Content>(k: K, v: Content[K]) => update((d) => ({ ...d, content: { ...d.content, [k]: v } }));
  const warnings = contrastWarnings(theme.palette);

  return (
    <div className="side-panel">
      {!only && (
        <div className="seg wide" role="tablist" aria-label="Editor">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === "Componentes" && (
        <div className="stack">
          <p className="muted small">
            Liguem, desliguem e reordenem os componentes. Cada um aparece só nas fases em que faz sentido.
          </p>
          <ol className="section-list">
            {design.sections.map((s, i) => (
              <li key={s.id} className={s.enabled ? undefined : "off"}>
                <label className="check">
                  <input
                    id={`sec-${s.id}`}
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) =>
                      update((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, enabled: e.target.checked } : x)) }))
                    }
                  />
                  <span>
                    {SECTIONS[s.id].label}
                    <small>{SECTIONS[s.id].phases.join(" · ")}</small>
                  </span>
                </label>
                <span className="order-btns">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={i === 0}
                    aria-label={`Subir ${SECTIONS[s.id].label}`}
                    onClick={() => update((d) => ({ ...d, sections: moveSection(d.sections, s.id, -1) }))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={i === design.sections.length - 1}
                    aria-label={`Descer ${SECTIONS[s.id].label}`}
                    onClick={() => update((d) => ({ ...d, sections: moveSection(d.sections, s.id, 1) }))}
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "Visual" && (
        <div className="stack">
          <h3 className="sub">Estilos prontos</h3>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="preset small" onClick={() => setTheme(p.theme)} title={p.description}>
                <span className="preset-swatch" style={{ background: p.theme.palette.background }}>
                  {[p.theme.palette.ink, p.theme.palette.accent, p.theme.palette.surface].map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                <strong>{p.name}</strong>
              </button>
            ))}
          </div>

          <h3 className="sub">Cores</h3>
          <div className="palette-edit">
            {(Object.keys(PALETTE_LABELS) as (keyof Palette)[]).map((k) => (
              <label key={k} className="color-field">
                <input
                  id={`color-${k}`}
                  type="color"
                  value={theme.palette[k]}
                  onChange={(e) => setTheme({ palette: { ...theme.palette, [k]: e.target.value.toUpperCase() } })}
                />
                <span>
                  {PALETTE_LABELS[k]}
                  <small className="mono">{theme.palette[k]}</small>
                </span>
              </label>
            ))}
          </div>
          {warnings.length > 0 && (
            <ul className="notice warn">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <h3 className="sub">Tipografia</h3>
          <SelectField id="font-display" label="Títulos" value={theme.displayFont} options={mapLabels(DISPLAY_FONTS)} onChange={(v) => setTheme({ displayFont: v })} />
          <SelectField id="font-body" label="Textos" value={theme.bodyFont} options={mapLabels(BODY_FONTS)} onChange={(v) => setTheme({ bodyFont: v })} />

          <h3 className="sub">Composição</h3>
          <SelectField id="layout" label="Layout da capa" value={theme.layout} options={LAYOUTS} onChange={(v) => setTheme({ layout: v })} />
          <SelectField id="nav" label="Menu" value={theme.navStyle} options={NAV_STYLES} onChange={(v) => setTheme({ navStyle: v })} />
          <SelectField id="buttons" label="Botões" value={theme.buttonStyle} options={BUTTON_STYLES} onChange={(v) => setTheme({ buttonStyle: v })} />
          <SelectField id="ornament" label="Ornamento" value={theme.ornament} options={ORNAMENTS} onChange={(v) => setTheme({ ornament: v })} />
        </div>
      )}

      {tab === "Textos" && (
        <div className="stack">
          <Fold title="O casamento" hint="Nomes, data e local" open={!info.partner_one || !info.partner_two || !info.wedding_date}>
            <div className="row2">
              <TextField id="w-p1" label="Nome" value={info.partner_one} maxLength={80} onCommit={(v) => setInfo({ partner_one: v })} />
              <TextField id="w-p2" label="Nome" value={info.partner_two} maxLength={80} onCommit={(v) => setInfo({ partner_two: v })} />
            </div>
            <TextField id="w-date" label="Data" type="date" value={info.wedding_date ?? ""} maxLength={10} onCommit={(v) => setInfo({ wedding_date: v || null })} />
            <div className="row2">
              <TextField id="w-venue" label="Local" value={info.venue} maxLength={160} placeholder="Ex.: Fazenda das Oliveiras" onCommit={(v) => setInfo({ venue: v })} />
              <TextField id="w-city" label="Cidade" value={info.city} maxLength={120} placeholder="Ex.: Itu, SP" onCommit={(v) => setInfo({ city: v })} />
            </div>
            <p className="muted small">Estes dados aparecem no site na hora, sem precisar publicar de novo.</p>
          </Fold>

          <Fold title="Boas-vindas e história" hint="O que os convidados leem primeiro" open>
            <TextField id="t-invite" label="Frase do convite" value={content.inviteLine} maxLength={140} onCommit={(v) => setContent("inviteLine", v)} />
            <TextField id="t-tagline" label="Frase de abertura" value={content.tagline} maxLength={240} multiline rows={2} onCommit={(v) => setContent("tagline", v)} />
            <TextField
              id="t-story"
              label="História do casal"
              value={content.story}
              maxLength={6000}
              multiline
              rows={8}
              hint="Separem os parágrafos com uma linha em branco."
              onCommit={(v) => setContent("story", v)}
            />
          </Fold>

          <Fold title="Cerimônia e recepção" hint="Horários, endereço e traje">
            <TextField id="t-ceremony" label="Cerimônia" value={content.ceremony} maxLength={1500} multiline rows={3} onCommit={(v) => setContent("ceremony", v)} />
            <TextField id="t-reception" label="Recepção" value={content.reception} maxLength={1500} multiline rows={3} onCommit={(v) => setContent("reception", v)} />
            <TextField id="t-dress" label="Traje (dress code)" value={content.dressCode} maxLength={1000} multiline rows={2} onCommit={(v) => setContent("dressCode", v)} />
            <TextField
              id="t-map"
              label="Link do mapa"
              type="url"
              value={content.mapUrl}
              maxLength={500}
              placeholder="https://maps.google.com/…"
              live={false}
              onCommit={(v) => setContent("mapUrl", v)}
            />
            {extras}
          </Fold>

          <Fold title="Linha do tempo" hint={content.timeline.length ? `${content.timeline.length} momentos` : "Opcional"}>
          <ListEditor<TimelineEntry>
            items={content.timeline}
            max={30}
            empty="Nenhum momento ainda."
            addLabel="Adicionar momento"
            make={() => ({ date: "", title: "Novo momento", text: "" })}
            onChange={(v) => setContent("timeline", v)}
            render={(t, set, i) => (
              <>
                <div className="row2">
                  <TextField id={`tl-date-${i}`} label="Quando" value={t.date} maxLength={40} placeholder="Março de 2015" onCommit={(date) => set({ ...t, date })} />
                  <TextField id={`tl-title-${i}`} label="Título" value={t.title} maxLength={120} onCommit={(title) => set({ ...t, title })} />
                </div>
                <TextField id={`tl-text-${i}`} label="Texto" value={t.text} maxLength={1000} multiline rows={2} onCommit={(text) => set({ ...t, text })} />
              </>
            )}
          />
          </Fold>

          <Fold title="Perguntas frequentes" hint={content.faq.length ? `${content.faq.length} perguntas` : "Opcional"}>
          <ListEditor<FaqEntry>
            items={content.faq}
            max={30}
            empty="Nenhuma pergunta ainda."
            addLabel="Adicionar pergunta"
            make={() => ({ q: "Nova pergunta", a: "" })}
            onChange={(v) => setContent("faq", v)}
            render={(f, set, i) => (
              <>
                <TextField id={`faq-q-${i}`} label="Pergunta" value={f.q} maxLength={200} onCommit={(q) => set({ ...f, q })} />
                <TextField id={`faq-a-${i}`} label="Resposta" value={f.a} maxLength={1500} multiline rows={2} onCommit={(a) => set({ ...f, a })} />
              </>
            )}
          />
          </Fold>

          <Fold title="Lista de presentes" hint={content.gifts.length ? `${content.gifts.length} presentes` : "Opcional"}>
          <TextField id="t-gifts-note" label="Recado sobre presentes" value={content.giftsNote} maxLength={600} multiline rows={2} onCommit={(v) => setContent("giftsNote", v)} />
          <ListEditor<Gift>
            items={content.gifts}
            max={60}
            empty="Nenhum presente ainda."
            addLabel="Adicionar presente"
            make={() => ({ title: "Novo presente", description: "", url: "", priceCents: null })}
            onChange={(v) => setContent("gifts", v)}
            render={(g, set, i) => (
              <>
                <TextField id={`gift-t-${i}`} label="Presente" value={g.title} maxLength={120} onCommit={(title) => set({ ...g, title })} />
                <TextField id={`gift-d-${i}`} label="Descrição" value={g.description} maxLength={400} onCommit={(description) => set({ ...g, description })} />
                <div className="row2">
                  <TextField
                    id={`gift-p-${i}`}
                    label="Valor (R$)"
                    value={g.priceCents === null ? "" : (g.priceCents / 100).toFixed(2).replace(".", ",")}
                    maxLength={12}
                    placeholder="Opcional"
                    live={false}
                    onCommit={(v) => {
                      const n = Number(v.replace(/\./g, "").replace(",", "."));
                      set({ ...g, priceCents: v.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null });
                    }}
                  />
                  <TextField id={`gift-u-${i}`} label="Link da loja" type="url" value={g.url} maxLength={500} placeholder="https://" live={false} onCommit={(url) => set({ ...g, url })} />
                </div>
              </>
            )}
          />
          <p className="muted small">A Eterna não processa pagamentos. Os links levam para a loja escolhida por vocês.</p>
          </Fold>

          <Fold title="Agradecimento" hint="Aparece depois do casamento">
            <TextField id="t-thanks" label="Agradecimento final" value={content.thankYou} maxLength={3000} multiline rows={4} onCommit={(v) => setContent("thankYou", v)} />
          </Fold>
        </div>
      )}
    </div>
  );
}

function mapLabels<T extends Record<string, { label: string }>>(o: T) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.label])) as Record<keyof T & string, string>;
}
