import Link from "next/link";
import { one, query } from "@/lib/db";
import { getOwnedWedding } from "@/lib/panel";
import { parseDesign } from "@/lib/design";
import { daysBetween, formatLongDate, parseDate, resolvePhase, todayInBrazil } from "@/lib/phase";
import { loadLiveData, publicWedding } from "@/lib/site";
import type { Guest, Rsvp, Task, WeddingDraft } from "@/lib/types";
import WeddingSite from "@/components/site/WeddingSite";
import TaskList from "@/components/panel/TaskList";
import CopyLinkButton from "@/components/panel/CopyLinkButton";

export const metadata = { title: "Início · Eterna" };

type Step = { title: string; text: string; href: string; cta: string; copy?: boolean };

export default async function InicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await getOwnedWedding(id);

  const [draft, guests, rsvps, tasks, pending, live] = await Promise.all([
    one<WeddingDraft>("select * from wedding_drafts where wedding_id = $1", [id]),
    query<Pick<Guest, "attending" | "party_size">>("select attending, party_size from guests where wedding_id = $1", [id]),
    query<Pick<Rsvp, "attending" | "party_size">>("select attending, party_size from rsvps where wedding_id = $1", [id]),
    query<Task>("select * from tasks where wedding_id = $1 order by done, due_date nulls last, created_at", [id]),
    one<{ n: number }>(
      `select ((select count(*) from contributions where wedding_id = $1 and status = 'pending')
             + (select count(*) from photos where wedding_id = $1 and status = 'pending'))::int as n`,
      [id],
    ),
    loadLiveData(wedding, { includePrivateLogistics: true }),
  ]);

  const design = parseDesign(draft?.design);
  const today = todayInBrazil();
  const date = parseDate(wedding.wedding_date);
  const daysLeft = date ? daysBetween(today, date) : null;
  const phase = resolvePhase(wedding.phase, wedding.wedding_date, today);
  const base = `/painel/${id}`;

  const confirmed = guests.filter((g) => g.attending).reduce((s, g) => s + g.party_size, 0) + rsvps.filter((r) => r.attending).reduce((s, r) => s + r.party_size, 0);
  const waiting = guests.filter((g) => g.attending === null).length;
  const answers = guests.filter((g) => g.attending !== null).length + rsvps.length;
  const toReview = pending?.n ?? 0;
  const memoriesMoment = phase !== "antes" || (daysLeft !== null && daysLeft <= 7);

  // Uma única sugestão: a mais útil para este momento do casamento.
  const step: Step =
    phase === "depois"
      ? wedding.accepting_contributions
        ? { title: "Revivam o grande dia", text: "Vejam as fotos e mensagens que os convidados enviaram e escolham o que fica no álbum.", href: `${base}/memorias`, cta: "Ver as memórias" }
        : { title: "Reúnam as memórias do casamento", text: "Ativem o envio de fotos e mensagens para os convidados ajudarem a montar o álbum.", href: `${base}/memorias`, cta: "Ativar memórias" }
      : memoriesMoment
        ? wedding.accepting_contributions
          ? { title: "Mostrem o QR Code aos convidados", text: "Com ele, os convidados enviam fotos e mensagens durante a festa, sem precisar de cadastro.", href: `${base}/memorias`, cta: "Ver o QR Code" }
          : { title: "Recebam fotos durante a festa", text: "Ativem o envio de fotos e mensagens. Vocês revisam tudo antes de aparecer no site.", href: `${base}/memorias`, cta: "Ativar memórias" }
        : !design.content.story && !design.content.tagline
          ? { title: "Contem um pouco da história de vocês", text: "Uma frase de abertura e alguns parágrafos já deixam o site com a cara de vocês.", href: `${base}/site?aba=textos`, cta: "Escrever a história" }
          : !wedding.wedding_date
            ? { title: "Definam a data do casamento", text: "Com a data, o site mostra a contagem regressiva e muda sozinho no grande dia.", href: `${base}/site?aba=textos`, cta: "Informar a data" }
            : !wedding.published
              ? { title: "Publiquem o site", text: "Quando estiverem satisfeitos, publiquem para os convidados poderem ver e confirmar presença.", href: `${base}/site`, cta: "Revisar e publicar" }
              : answers === 0
                ? { title: "Compartilhem o convite", text: "Enviem o link do site para os convidados confirmarem presença.", href: `${base}/convidados`, cta: "Copiar o link do site", copy: true }
                : { title: "Acompanhem as confirmações", text: `${confirmed} ${confirmed === 1 ? "pessoa confirmou" : "pessoas confirmaram"} até agora${waiting ? ` e ${waiting} ${waiting === 1 ? "convite aguarda" : "convites aguardam"} resposta` : ""}.`, href: `${base}/convidados`, cta: "Ver convidados" };

  const when =
    daysLeft === null ? "Data a definir" : daysLeft > 1 ? `Faltam ${daysLeft} dias` : daysLeft === 1 ? "É amanhã!" : daysLeft === 0 ? "É hoje!" : `Casaram há ${-daysLeft} ${daysLeft === -1 ? "dia" : "dias"}`;

  return (
    <div className="page home">
      <header className="home-head">
        <span className="mono">{when}</span>
        <h1>
          {wedding.partner_one} &amp; {wedding.partner_two}
        </h1>
        <p className="lede">{[formatLongDate(wedding.wedding_date), wedding.venue].filter(Boolean).join(" · ") || "Vamos construir o site de vocês juntos."}</p>
      </header>

      {wedding.is_demo && <p className="notice">Este é um casamento de demonstração, com nomes e mensagens fictícios.</p>}

      <section className="next-step" aria-labelledby="proximo-passo">
        <span className="mono">Próximo passo</span>
        <h2 id="proximo-passo">{step.title}</h2>
        <p>{step.text}</p>
        <div className="row-actions">
          {step.copy && wedding.published ? (
            <CopyLinkButton path={`/c/${wedding.slug}`} label={step.cta} className="btn primary large" />
          ) : (
            <Link href={step.href} className="btn primary large">
              {step.cta}
            </Link>
          )}
        </div>
      </section>

      <div className="home-grid">
        <section className="card my-wedding" aria-labelledby="meu-casamento">
          <div className="card-head">
            <h2 id="meu-casamento">Meu site</h2>
            <span className={`chip ${wedding.published ? "ok" : ""}`}>{wedding.published ? "Publicado" : "Ainda não publicado"}</span>
          </div>
          <div className="mini-preview preview-scroll" tabIndex={0} aria-label="Prévia do site">
            <div className="mini-preview-inner">
              <WeddingSite data={{ ...live, wedding: publicWedding(wedding), design, invitation: null }} phase={phase} mode="preview" today={today} />
            </div>
          </div>
          <div className="row-actions">
            <Link href={`${base}/site`} className="btn primary">
              Continuar editando
            </Link>
            {wedding.published && (
              <>
                <a href={`/c/${wedding.slug}`} target="_blank" rel="noopener noreferrer" className="btn ghost">
                  Ver o site
                </a>
                <CopyLinkButton path={`/c/${wedding.slug}`} label="Copiar link" className="text-link" />
              </>
            )}
          </div>
        </section>

        <div className="home-links">
          <Link href={`${base}/convidados`} className="home-link">
            <span className="mono">Convidados</span>
            <strong>{answers ? `${confirmed} ${confirmed === 1 ? "confirmado" : "confirmados"}` : "Convites e confirmações"}</strong>
            <span className="muted small">{answers ? `${waiting} ${waiting === 1 ? "aguardando resposta" : "aguardando resposta"}` : "Compartilhem o link e acompanhem as respostas."}</span>
          </Link>
          <Link href={`${base}/memorias`} className={`home-link${memoriesMoment || toReview ? " highlight" : " quiet"}`}>
            <span className="mono">Nossas memórias</span>
            <strong>
              {toReview
                ? `${toReview} ${toReview === 1 ? "memória para revisar" : "memórias para revisar"}`
                : wedding.accepting_contributions
                  ? "Recebendo fotos e mensagens"
                  : "Fotos e mensagens dos convidados"}
            </strong>
            <span className="muted small">
              {wedding.accepting_contributions ? "Vocês aprovam tudo antes de aparecer." : memoriesMoment ? "Este é um bom momento para ativar." : "Ativem quando quiserem, perto do casamento."}
            </span>
          </Link>
          <Link href={`${base}/site?aba=textos`} className="home-link quiet">
            <span className="mono">Informações do evento</span>
            <strong>{live.schedule.length ? `${live.schedule.length} ${live.schedule.length === 1 ? "item na programação" : "itens na programação"}` : "Programação e locais"}</strong>
            <span className="muted small">Textos, cerimônia, recepção e programação.</span>
          </Link>
        </div>
      </div>

      <details className="card home-tasks">
        <summary>
          <h2>Lista de tarefas</h2>
          <span className="muted small">{tasks.filter((t) => !t.done).length} pendentes</span>
        </summary>
        <TaskList weddingId={id} initial={tasks} />
      </details>
    </div>
  );
}
