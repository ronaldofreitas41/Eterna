"use client";

import { useState } from "react";
import { parseBRL, type Content, type FaqEntry, type Gift, type TimelineEntry } from "@/lib/design";
import { PIX_KEY_TYPES, normalizePixKey, pixReady, type PixSettings } from "@/lib/pix";
import { PRESETS } from "@/lib/presets";
import { SECTIONS, moveSection } from "@/lib/sections";
import {
  BODY_FONTS,
  BUTTON_STYLES,
  DISPLAY_FONTS,
  EFFECTS,
  LAYOUTS,
  NAV_STYLES,
  ORNAMENTS,
  Palette,
  contrastWarnings,
  splineEmbed,
} from "@/lib/theme";
import type { WorkspaceApi } from "./DesignWorkspace";
import { Fold, ListEditor, SelectField, TextField } from "./fields";

const TABS = ["Componentes", "Visual", "Textos", "Presentes"] as const;
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
              <button key={p.id} type="button" className="preset small" onClick={() => setTheme({ ...p.theme, splineUrl: theme.splineUrl })} title={p.description}>
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

          <h3 className="sub">Efeito 3D na capa</h3>
          <SelectField id="effect" label="Efeito" value={theme.effect} options={EFFECTS} onChange={(v) => setTheme({ effect: v })} />
          {theme.effect === "spline" && (
            <>
              <TextField
                id="spline"
                label="Link da cena no Spline"
                value={theme.splineUrl}
                maxLength={300}
                live={false}
                placeholder="https://my.spline.design/..."
                hint="No Spline, use Export → Public URL e colem o link aqui. A cena aparece atrás dos nomes."
                onCommit={(v) => setTheme({ splineUrl: v.trim() })}
              />
              {theme.splineUrl && !splineEmbed(theme.splineUrl) && <p className="notice warn">Esse link não é de uma cena publicada do Spline. Ele começa com https://my.spline.design/.</p>}
            </>
          )}
          {theme.effect !== "none" && <p className="muted small">O efeito é suave, pausa quando sai da tela e fica parado para quem prefere menos movimento.</p>}
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

          <Fold title="Agradecimento" hint="Aparece depois do casamento">
            <TextField id="t-thanks" label="Agradecimento final" value={content.thankYou} maxLength={3000} multiline rows={4} onCommit={(v) => setContent("thankYou", v)} />
          </Fold>
        </div>
      )}

      {tab === "Presentes" && <GiftsEditor api={api} />}
    </div>
  );
}

const GIFT_IDEAS: Gift[] = [
  { title: "Cota da lua de mel", description: "Qualquer valor ajuda a gente a viajar.", url: "", priceCents: null },
  { title: "Jantar romântico", description: "Para comemorarmos a dois.", url: "", priceCents: 30000 },
  { title: "Utensílios para a casa nova", description: "", url: "", priceCents: 15000 },
  { title: "Passeio na viagem", description: "", url: "", priceCents: 20000 },
];

function GiftsEditor({ api }: { api: WorkspaceApi }) {
  const { design, update } = api;
  const { content } = design;
  const pix = content.pix;
  const setContent = <K extends keyof Content>(k: K, v: Content[K]) => update((d) => ({ ...d, content: { ...d.content, [k]: v } }));
  const setPix = (patch: Partial<PixSettings>) => update((d) => ({ ...d, content: { ...d.content, pix: { ...d.content.pix, ...patch } } }));
  const ready = pixReady(pix);
  const keyOk = !pix.key.trim() || normalizePixKey(pix.type, pix.key) !== null;
  const section = design.sections.find((s) => s.id === "gifts");

  return (
    <div className="stack">
      <p className="muted small">Montem a lista e recebam os presentes por Pix, direto na conta de vocês. Sem taxas: o dinheiro não passa pela Eterna.</p>

      {section && !section.enabled && (
        <p className="notice" role="status">
          A lista está escondida no site.{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => update((d) => ({ ...d, sections: d.sections.map((s) => (s.id === "gifts" ? { ...s, enabled: true } : s)) }))}
          >
            Mostrar no site
          </button>
        </p>
      )}

      <Fold title="Como receber" hint={ready ? `Pix pronto · ${PIX_KEY_TYPES[pix.type]}` : "Configurem a chave Pix"} open={!ready}>
        <SelectField id="pix-type" label="Tipo da chave Pix" value={pix.type} options={PIX_KEY_TYPES} onChange={(type) => setPix({ type })} />
        <TextField
          id="pix-key"
          label="Chave Pix"
          value={pix.key}
          maxLength={80}
          placeholder={pix.type === "email" ? "nome@email.com" : pix.type === "phone" ? "(11) 91234-5678" : pix.type === "cpf" ? "Só os números" : "Ex.: 123e4567-e89b-12d3-a456-426614174000"}
          hint={keyOk ? "A chave aparece para quem abrir o site. Prefiram a aleatória ou o e-mail em vez do CPF." : "Essa chave não parece válida para o tipo escolhido. Confiram os números ou o formato."}
          onCommit={(key) => setPix({ key })}
        />
        <div className="row2">
          <TextField id="pix-name" label="Nome de quem recebe" value={pix.name} maxLength={60} placeholder="Como está no banco" onCommit={(name) => setPix({ name })} />
          <TextField id="pix-city" label="Cidade da conta" value={pix.city} maxLength={40} placeholder="Ex.: São Paulo" onCommit={(city) => setPix({ city })} />
        </div>
        {ready && <p className="notice ok">Pronto! Cada presente ganhou o botão “Presentear com Pix”. Façam um Pix de teste de R$ 1 pelo site para conferir.</p>}
      </Fold>

      <TextField id="t-gifts-note" label="Recado para os convidados" value={content.giftsNote} maxLength={600} multiline rows={2} placeholder="Ex.: Sua presença é o nosso maior presente." onCommit={(v) => setContent("giftsNote", v)} />

      <h3 className="sub">Presentes</h3>
      {content.gifts.length === 0 && (
        <div className="idea-chips" aria-label="Sugestões de presentes">
          <span className="mono">Comecem com uma sugestão</span>
          {GIFT_IDEAS.map((g) => (
            <button key={g.title} type="button" onClick={() => setContent("gifts", [...content.gifts, g])}>
              {g.title}
            </button>
          ))}
        </div>
      )}
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
            <TextField id={`gift-d-${i}`} label="Descrição (opcional)" value={g.description} maxLength={400} onCommit={(description) => set({ ...g, description })} />
            <div className="row2">
              <TextField
                id={`gift-p-${i}`}
                label="Valor (R$)"
                value={g.priceCents === null ? "" : (g.priceCents / 100).toFixed(2).replace(".", ",")}
                maxLength={14}
                placeholder="Vazio: o convidado escolhe"
                live={false}
                onCommit={(v) => set({ ...g, priceCents: parseBRL(v) })}
              />
              <TextField id={`gift-u-${i}`} label="Link de uma loja (opcional)" type="url" value={g.url} maxLength={500} placeholder="https://" live={false} onCommit={(url) => set({ ...g, url })} />
            </div>
          </>
        )}
      />
    </div>
  );
}

function mapLabels<T extends Record<string, { label: string }>>(o: T) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.label])) as Record<keyof T & string, string>;
}
