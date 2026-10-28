"use client";

import { useState } from "react";
import {
  createCampaign,
  createChapter,
  deleteCampaign,
  deleteChapter,
  deleteContribution,
  moderateContribution,
  updateCampaign,
  updateChapter,
} from "@/app/painel/acoes/juntos";
import { formatLongDate } from "@/lib/phase";
import { KIND_LABELS, type Audience, type Campaign, type Chapter, type Contribution, type ContributionKind, type GuestGroup } from "@/lib/types";
import ConfirmButton from "@/components/panel/ConfirmButton";

type Item = Contribution & { photoUrl: string | null };
type Props = {
  weddingId: string;
  initialContributions: Item[];
  initialChapters: Chapter[];
  initialCampaigns: Campaign[];
  groups: GuestGroup[];
  capsule: { count: number; open_date: string | null; is_open: boolean } | null;
};

const AUDIENCE: Record<Audience, string> = {
  everyone: "Qualquer visitante do site",
  invited: "Só convidados com convite individual",
  groups: "Só os grupos escolhidos",
};
const TABS = ["Aguardando", "Publicadas", "Privadas", "Campanhas", "Capítulos"] as const;

export default function TogetherManager({ weddingId, initialContributions, initialChapters, initialCampaigns, groups, capsule }: Props) {
  const [items, setItems] = useState(initialContributions);
  const [chapters, setChapters] = useState(initialChapters);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Aguardando");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (text: string, ok = true) => setMsg({ text, ok });

  const pending = items.filter((c) => c.status === "pending");
  const published = items.filter((c) => c.status === "published");
  const hidden = items.filter((c) => c.status === "private" || c.status === "rejected");
  const capsuleOpen = items.filter((c) => c.status === "capsule");
  const campaignTitle = (id: string | null) => campaigns.find((c) => c.id === id)?.title;
  const chapterTitle = (id: string | null) => chapters.find((c) => c.id === id)?.title;

  async function patch(c: Item, p: Pick<Partial<Contribution>, "status" | "chapter_id" | "display_title" | "display_body">, text: string) {
    const res = await moderateContribution(weddingId, c.id, p);
    if (!res.ok) return say(res.error, false);
    setItems((l) => l.map((x) => (x.id === c.id ? { ...x, ...p } : x)));
    say(text);
  }

  async function remove(c: Item) {
    const res = await deleteContribution(weddingId, c.id);
    if (!res.ok) return say(res.error, false);
    setItems((l) => l.filter((x) => x.id !== c.id));
    say("Contribuição excluída definitivamente.");
  }

  const card = (c: Item, actions: React.ReactNode, editable = false) => (
    <article key={c.id} className="memory">
      {c.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.photoUrl} alt="" />
      )}
      <div className="memory-body">
        <span className="mono">
          {KIND_LABELS[c.kind]}
          {campaignTitle(c.campaign_id) && ` · ${campaignTitle(c.campaign_id)}`}
        </span>
        {(c.display_title ?? c.title) && <h3>{c.display_title ?? c.title}</h3>}
        {(c.display_body ?? c.body) && <blockquote>{c.display_body ?? c.body}</blockquote>}
        <p className="memory-author">
          {c.author_name}
          {c.relation && ` · ${c.relation}`}
          <small> · {new Date(c.created_at).toLocaleDateString("pt-BR")}</small>
        </p>
        {c.ai_note && <p className={`ai-note${c.ai_note.startsWith("Atenção") ? " warn" : ""}`}>{c.ai_note}</p>}
        {editable && (
          <details className="edit-presentation">
            <summary>Editar apresentação</summary>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const t = String(f.get("t") ?? "").trim();
                const b = String(f.get("b") ?? "").trim();
                patch(c, { display_title: t && t !== c.title ? t : null, display_body: b && b !== c.body ? b : null }, "Apresentação atualizada. O texto original do convidado foi preservado.");
              }}
            >
              <label className="field">
                <span>Título</span>
                <input id={`dt-${c.id}`} name="t" maxLength={160} defaultValue={c.display_title ?? c.title} />
              </label>
              <label className="field">
                <span>Texto</span>
                <textarea id={`db-${c.id}`} name="b" rows={3} maxLength={4000} defaultValue={c.display_body ?? c.body} />
              </label>
              <button className="btn ghost small">Salvar apresentação</button>
            </form>
          </details>
        )}
        <div className="memory-actions">{actions}</div>
      </div>
    </article>
  );

  const chapterSelect = (c: Item, value: string | null, onChange: (v: string | null) => void) => (
    <select id={`ch-${c.id}`} aria-label="Capítulo" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Livro de mensagens (sem capítulo)</option>
      {chapters.map((ch) => (
        <option key={ch.id} value={ch.id}>
          {ch.title}
        </option>
      ))}
    </select>
  );

  return (
    <div className="stack-lg">
      {msg && (
        <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
          {msg.text}
        </p>
      )}

      <div className="seg wide" role="tablist" aria-label="Construir Juntos">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
            {t === "Aguardando" && pending.length > 0 && <span className="badge">{pending.length}</span>}
          </button>
        ))}
      </div>

      {tab === "Aguardando" && (
        <section className="album">
          {pending.length === 0 && <p className="empty-state">Nada aguardando. Quando alguém contribuir, a lembrança aparece aqui primeiro.</p>}
          {pending.map((c) => (
            <PendingCard key={c.id} item={c} render={card} chapterSelect={chapterSelect} onPatch={patch} onRemove={remove} />
          ))}
        </section>
      )}

      {tab === "Publicadas" && (
        <section className="album">
          {published.length === 0 && <p className="empty-state">Nenhuma contribuição publicada ainda.</p>}
          {published.map((c) =>
            card(
              c,
              <>
                <span className="mono">{chapterTitle(c.chapter_id) ?? "Livro de mensagens"}</span>
                {chapterSelect(c, c.chapter_id, (v) => patch(c, { chapter_id: v }, "Capítulo alterado."))}
                <button type="button" className="text-link" onClick={() => patch(c, { status: "private" }, "Agora só vocês veem esta contribuição.")}>
                  Tornar privada
                </button>
                <ConfirmButton label="Excluir" confirmLabel="Excluir definitivamente?" onConfirm={() => remove(c)} />
              </>,
              true,
            ),
          )}
        </section>
      )}

      {tab === "Privadas" && (
        <section className="album">
          {hidden.length === 0 && <p className="empty-state">Nenhuma contribuição privada ou recusada.</p>}
          {hidden.map((c) =>
            card(
              c,
              <>
                <span className={`chip ${c.status === "rejected" ? "no" : ""}`}>{c.status === "rejected" ? "Recusada" : "Privada"}</span>
                <button type="button" className="text-link" onClick={() => patch(c, { status: "published" }, "Contribuição publicada.")}>
                  Publicar
                </button>
                <ConfirmButton label="Excluir" confirmLabel="Excluir definitivamente?" onConfirm={() => remove(c)} />
              </>,
            ),
          )}
        </section>
      )}

      {tab === "Campanhas" && (
        <CampaignsEditor weddingId={weddingId} campaigns={campaigns} setCampaigns={setCampaigns} groups={groups} say={say} />
      )}

      {tab === "Capítulos" && <ChaptersEditor weddingId={weddingId} chapters={chapters} setChapters={setChapters} say={say} />}

      <section className="card capsule-card">
        <span className="mono">Cápsula do tempo</span>
        {capsule?.open_date ? (
          capsule.is_open ? (
            <>
              <h2>A cápsula foi aberta</h2>
              <div className="album">{capsuleOpen.map((c) => card(c, null))}</div>
            </>
          ) : (
            <>
              <h2>{capsule.count === 1 ? "1 mensagem lacrada" : `${capsule.count} mensagens lacradas`}</h2>
              <p className="muted">
                Elas abrem em {formatLongDate(capsule.open_date)}. Até lá, nem vocês conseguem ler: o conteúdo fica bloqueado no banco
                de dados.
              </p>
            </>
          )
        ) : (
          <p className="muted">Definam a data de abertura em Fases e configurações para ativar a cápsula.</p>
        )}
      </section>
    </div>
  );
}

function PendingCard({
  item,
  render,
  chapterSelect,
  onPatch,
  onRemove,
}: {
  item: Item;
  render: (c: Item, actions: React.ReactNode) => React.ReactNode;
  chapterSelect: (c: Item, v: string | null, on: (v: string | null) => void) => React.ReactNode;
  onPatch: (c: Item, p: Partial<Contribution>, text: string) => void;
  onRemove: (c: Item) => void;
}) {
  const [chapter, setChapter] = useState(item.ai_chapter_id);
  return render(
    item,
    <>
      {chapterSelect(item, chapter, setChapter)}
      <button type="button" className="btn primary small" onClick={() => onPatch(item, { status: "published", chapter_id: chapter }, "Publicada no site.")}>
        Publicar
      </button>
      <button type="button" className="btn ghost small" onClick={() => onPatch(item, { status: "private" }, "Guardada só para vocês.")}>
        Manter privada
      </button>
      <button type="button" className="text-link" onClick={() => onPatch(item, { status: "rejected" }, "Contribuição recusada. Ela não aparece no site.")}>
        Recusar
      </button>
      <ConfirmButton label="Excluir" confirmLabel="Excluir definitivamente?" onConfirm={() => onRemove(item)} />
    </>,
  );
}

function CampaignsEditor({
  weddingId,
  campaigns,
  setCampaigns,
  groups,
  say,
}: {
  weddingId: string;
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  groups: GuestGroup[];
  say: (t: string, ok?: boolean) => void;
}) {

  function read(f: FormData) {
    const audience = f.get("audience") as Audience;
    return {
      title: String(f.get("title") ?? ""),
      prompt: String(f.get("prompt") ?? ""),
      kind: f.get("kind") as ContributionKind,
      audience,
      group_ids: audience === "groups" ? (f.getAll("groups") as string[]) : [],
      active: f.get("active") === "on",
    };
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const res = await createCampaign(weddingId, read(new FormData(form)));
    if (!res.ok) return say(res.error, false);
    setCampaigns((l) => [...l, res.data]);
    form.reset();
    say(`Campanha “${res.data.title}” criada.`);
  }

  async function save(c: Campaign, f: FormData) {
    const res = await updateCampaign(weddingId, c.id, read(f));
    if (!res.ok) return say(res.error, false);
    setCampaigns((l) => l.map((x) => (x.id === c.id ? res.data : x)));
    say("Campanha atualizada.");
  }

  async function remove(c: Campaign) {
    const res = await deleteCampaign(weddingId, c.id);
    if (!res.ok) return say(res.error, false);
    setCampaigns((l) => l.filter((x) => x.id !== c.id));
    say("Campanha excluída. As contribuições recebidas continuam aqui.");
  }

  const fields = (c?: Campaign) => {
    const key = c?.id ?? "new";
    return (
      <>
        <label className="field">
          <span>Convite para contribuir</span>
          <input id={`cp-title-${key}`} name="title" required maxLength={160} defaultValue={c?.title} placeholder="Conte uma história que talvez ainda não conheçamos" />
        </label>
        <label className="field">
          <span>Orientação (opcional)</span>
          <input id={`cp-prompt-${key}`} name="prompt" maxLength={600} defaultValue={c?.prompt} />
        </label>
        <div className="row2">
          <label className="field">
            <span>Formato</span>
            <select id={`cp-kind-${key}`} name="kind" defaultValue={c?.kind ?? "memory"}>
              {(Object.keys(KIND_LABELS) as ContributionKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quem pode participar</span>
            <select id={`cp-aud-${key}`} name="audience" defaultValue={c?.audience ?? "invited"}>
              {(Object.keys(AUDIENCE) as Audience[]).map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE[a]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {groups.length > 0 && (
          <fieldset className="field">
            <legend>Grupos (quando “só os grupos escolhidos”)</legend>
            <div className="chip-checks">
              {groups.map((g) => (
                <label key={g.id} className="check">
                  <input id={`cp-g-${key}-${g.id}`} type="checkbox" name="groups" value={g.id} defaultChecked={c?.group_ids.includes(g.id)} />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="check">
          <input id={`cp-active-${key}`} name="active" type="checkbox" defaultChecked={c?.active ?? true} />
          <span>Recebendo contribuições</span>
        </label>
      </>
    );
  };

  return (
    <section className="card">
      <h2>Campanhas</h2>
      <p className="muted small">Cada campanha é um convite para os convidados contarem algo. Vocês definem quem pode participar.</p>
      <div className="group-list">
        {campaigns.map((c) => (
          <details key={c.id} className="group">
            <summary>
              <strong>{c.title}</strong>
              <span className="mono">
                {KIND_LABELS[c.kind]} · {AUDIENCE[c.audience]} {c.active ? "" : "· pausada"}
              </span>
            </summary>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                save(c, new FormData(e.currentTarget));
              }}
            >
              {fields(c)}
              <div className="row-actions">
                <button className="btn ghost small">Salvar campanha</button>
                <ConfirmButton label="Excluir" confirmLabel="Confirmar exclusão" onConfirm={() => remove(c)} />
              </div>
            </form>
          </details>
        ))}
      </div>
      <form className="form inline-card" onSubmit={add}>
        <h3 className="sub">Nova campanha</h3>
        {fields()}
        <button className="btn primary small">Criar campanha</button>
      </form>
    </section>
  );
}

function ChaptersEditor({
  weddingId,
  chapters,
  setChapters,
  say,
}: {
  weddingId: string;
  chapters: Chapter[];
  setChapters: React.Dispatch<React.SetStateAction<Chapter[]>>;
  say: (t: string, ok?: boolean) => void;
}) {
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const res = await createChapter(weddingId, { title: String(f.get("title") ?? ""), intro: String(f.get("intro") ?? "") });
    if (!res.ok) return say(res.error, false);
    setChapters((l) => [...l, res.data]);
    form.reset();
    say(`Capítulo “${res.data.title}” criado.`);
  }
  async function save(ch: Chapter, f: FormData) {
    const p = { title: String(f.get("title")).trim(), intro: String(f.get("intro") ?? "").trim() };
    const res = await updateChapter(weddingId, ch.id, p);
    if (!res.ok) return say(res.error, false);
    setChapters((l) => l.map((x) => (x.id === ch.id ? { ...x, ...p } : x)));
    say("Capítulo atualizado.");
  }
  async function remove(ch: Chapter) {
    const res = await deleteChapter(weddingId, ch.id);
    if (!res.ok) return say(res.error, false);
    setChapters((l) => l.filter((x) => x.id !== ch.id));
    say("Capítulo excluído. As contribuições dele foram para o livro de mensagens.");
  }
  return (
    <section className="card">
      <h2>Capítulos da história</h2>
      <p className="muted small">A IA sugere um capítulo para cada contribuição. Vocês decidem onde ela entra.</p>
      <div className="group-list">
        {chapters.map((ch) => (
          <details key={ch.id} className="group">
            <summary>
              <strong>{ch.title}</strong>
            </summary>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                save(ch, new FormData(e.currentTarget));
              }}
            >
              <label className="field">
                <span>Título</span>
                <input id={`chap-t-${ch.id}`} name="title" required maxLength={120} defaultValue={ch.title} />
              </label>
              <label className="field">
                <span>Introdução</span>
                <input id={`chap-i-${ch.id}`} name="intro" maxLength={1000} defaultValue={ch.intro} />
              </label>
              <div className="row-actions">
                <button className="btn ghost small">Salvar</button>
                <ConfirmButton label="Excluir" confirmLabel="Confirmar exclusão" onConfirm={() => remove(ch)} />
              </div>
            </form>
          </details>
        ))}
      </div>
      <form className="form inline-card" onSubmit={add}>
        <h3 className="sub">Novo capítulo</h3>
        <label className="field">
          <span>Título</span>
          <input id="chap-new-t" name="title" required maxLength={120} placeholder="A viagem a Lisboa" />
        </label>
        <label className="field">
          <span>Introdução (opcional)</span>
          <input id="chap-new-i" name="intro" maxLength={1000} />
        </label>
        <button className="btn primary small">Criar capítulo</button>
      </form>
    </section>
  );
}
