import Link from "next/link";
import { one, query } from "@/lib/db";
import { getOwnedWedding } from "@/lib/panel";
import { parseDesign } from "@/lib/design";
import { daysBetween, formatLongDate, parseDate, PHASE_NAMES, resolvePhase } from "@/lib/phase";
import { loadLiveData, publicWedding } from "@/lib/site";
import type { Guest, Rsvp, Task, WeddingDraft } from "@/lib/types";
import WeddingSite from "@/components/site/WeddingSite";
import TaskList from "@/components/panel/TaskList";

export const metadata = { title: "Visão geral · Eterna" };

const COUNTS = `
  select (select count(*)::int from contributions where wedding_id = $1 and status = 'pending') as contrib,
         (select count(*)::int from photos where wedding_id = $1 and status = 'pending') as photos,
         (select count(*)::int from guest_groups where wedding_id = $1) as groups,
         (select count(*)::int from campaigns where wedding_id = $1 and active) as campaigns,
         (select count(*)::int from design_references where wedding_id = $1) as refs`;

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await getOwnedWedding(id);

  const [draft, g, r, tasks, counts, live] = await Promise.all([
    one<WeddingDraft>("select * from wedding_drafts where wedding_id = $1", [id]),
    query<Pick<Guest, "attending" | "party_size">>("select attending, party_size from guests where wedding_id = $1", [id]),
    query<Pick<Rsvp, "attending" | "party_size">>("select attending, party_size from rsvps where wedding_id = $1", [id]),
    query<Task>("select * from tasks where wedding_id = $1 order by done, due_date nulls last, created_at", [id]),
    one<{ contrib: number; photos: number; groups: number; campaigns: number; refs: number }>(COUNTS, [id]),
    loadLiveData(wedding, { includePrivateLogistics: true }),
  ]);
  const n = counts ?? { contrib: 0, photos: 0, groups: 0, campaigns: 0, refs: 0 };

  const design = parseDesign(draft?.design);
  const confirmedPeople =
    g.filter((x) => x.attending).reduce((s, x) => s + x.party_size, 0) + r.filter((x) => x.attending).reduce((s, x) => s + x.party_size, 0);
  const responded = g.filter((x) => x.attending !== null).length;
  const today = new Date();
  const date = parseDate(wedding.wedding_date);
  const daysLeft = date ? daysBetween(today, date) : null;
  const phase = resolvePhase(wedding.phase, wedding.wedding_date, today);

  const checklist = [
    { done: Boolean(wedding.wedding_date), label: "Definir a data", href: "configuracoes" },
    { done: n.refs > 0, label: "Enviar referências visuais", href: "estudio" },
    { done: Boolean(design.content.story), label: "Contar a história do casal", href: "editor" },
    { done: live.schedule.length > 0, label: "Montar a programação", href: "programacao" },
    { done: n.groups > 0 && g.length > 0, label: "Cadastrar grupos e convidados", href: "convidados" },
    { done: n.campaigns > 0, label: "Abrir uma campanha do Construir Juntos", href: "juntos" },
    { done: wedding.published, label: "Publicar o site", href: "editor" },
  ];
  const progress = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="mono">{PHASE_NAMES[phase]}</span>
          <h1>
            {wedding.partner_one} &amp; {wedding.partner_two}
          </h1>
          <p className="lede">
            {formatLongDate(wedding.wedding_date) || "Data a definir"}
            {wedding.venue && ` · ${wedding.venue}`}
            {daysLeft !== null && daysLeft > 0 && ` · faltam ${daysLeft} dias`}
          </p>
        </div>
        <div className="row-actions">
          <Link href={`/painel/${id}/estudio`} className="btn ghost">
            Abrir o estúdio
          </Link>
          <Link href={`/painel/${id}/editor`} className="btn primary">
            Editar o site
          </Link>
        </div>
      </header>

      {wedding.is_demo && <p className="notice">Este é um casamento de demonstração, com nomes e mensagens fictícios.</p>}

      <section className="stats" aria-label="Números do casamento">
        <Link href={`/painel/${id}/convidados`} className="stat">
          <span className="stat-n">{g.length}</span>
          <span>convidados cadastrados</span>
          <small>{responded} responderam pelo convite</small>
        </Link>
        <Link href={`/painel/${id}/convidados`} className="stat">
          <span className="stat-n">{confirmedPeople}</span>
          <span>pessoas confirmadas</span>
          <small>{r.length} pelo link aberto</small>
        </Link>
        <Link href={`/painel/${id}/juntos`} className={`stat${n.contrib ? " attention" : ""}`}>
          <span className="stat-n">{n.contrib}</span>
          <span>contribuições aguardando</span>
          <small>{live.chapters.reduce((s, c) => s + c.entries.length, 0) + live.guestbook.length} publicadas</small>
        </Link>
        <Link href={`/painel/${id}/fotos`} className={`stat${n.photos ? " attention" : ""}`}>
          <span className="stat-n">{n.photos}</span>
          <span>fotos aguardando</span>
          <small>{live.photos.length} aprovadas</small>
        </Link>
      </section>

      <div className="overview-grid">
        <section className="card">
          <div className="card-head">
            <h2>Progresso</h2>
            <span className="mono">{progress}%</span>
          </div>
          <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso de criação">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ul className="checklist">
            {checklist.map((c) => (
              <li key={c.label} className={c.done ? "done" : undefined}>
                <span className="check-dot" aria-hidden="true" />
                {c.done ? <span>{c.label}</span> : <Link href={`/painel/${id}/${c.href}`}>{c.label}</Link>}
                <span className="sr-only">{c.done ? "concluído" : "pendente"}</span>
              </li>
            ))}
          </ul>
          <h3 className="sub">Tarefas de vocês</h3>
          <TaskList weddingId={id} initial={tasks} />
        </section>

        <section className="card preview-card">
          <div className="card-head">
            <h2>Prévia do rascunho</h2>
            <Link href={`/painel/${id}/editor`} className="text-link">
              Editar
            </Link>
          </div>
          <div className="mini-preview" aria-hidden="true">
            <div className="mini-preview-inner">
              <WeddingSite data={{ ...live, wedding: publicWedding(wedding), design, invitation: null }} phase={phase} mode="preview" today={today} />
            </div>
          </div>
          <div className="shortcuts">
            <Link href={`/painel/${id}/convidados`}>Convidados</Link>
            <Link href={`/painel/${id}/programacao`}>Programação</Link>
            <Link href={`/painel/${id}/juntos`}>Memórias</Link>
            <Link href={`/painel/${id}/configuracoes`}>Fases e QR Code</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
