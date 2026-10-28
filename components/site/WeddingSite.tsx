import { formatBRL, safeUrl } from "@/lib/design";
import { daysBetween, formatLongDate, parseDate } from "@/lib/phase";
import { visibleSections, type SectionId } from "@/lib/sections";
import type { SiteData, SiteEntry } from "@/lib/site";
import { themeStyle } from "@/lib/theme";
import type { SitePhase } from "@/lib/types";
import Ornament from "./Ornament";
import ScheduleList from "./ScheduleList";
import RsvpForm from "./RsvpForm";
import ContributionForm from "./ContributionForm";
import PhotoUpload from "./PhotoUpload";

export type SiteMode = "live" | "preview" | "demo";
type Props = { data: SiteData; phase: SitePhase; mode: SiteMode; today: Date };

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const NAV: Partial<Record<SectionId, string>> = {
  story: "Nossa história",
  schedule: "Programação",
  location: "Como chegar",
  rsvp: "Presença",
  gifts: "Presentes",
  gallery: "Fotos",
  together: "Construir Juntos",
  guestbook: "Mensagens",
};

function Entry({ e }: { e: SiteEntry }) {
  return (
    <figure className="s-entry">
      {e.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.photoUrl} alt="" loading="lazy" />
      )}
      {e.title && <h4>{e.title}</h4>}
      {e.body && <blockquote>{e.body}</blockquote>}
      <figcaption>
        {e.author_name}
        {e.relation && ` · ${e.relation}`}
      </figcaption>
    </figure>
  );
}

export default function WeddingSite({ data, phase, mode, today }: Props) {
  const { wedding: w, design, invitation } = data;
  const { theme, content: c } = design;
  const disabled = mode !== "live";
  const order = visibleSections(design.sections, phase);
  const date = parseDate(w.wedding_date);
  const daysLeft = date ? daysBetween(today, date) : null;
  const where = [w.venue, w.city].filter(Boolean).join(" · ");
  const names = `${w.partner_one || "Noiva"} & ${w.partner_two || "Noivo"}`;

  const campaigns = data.campaigns.filter(
    (cp) =>
      cp.audience === "everyone" ||
      (invitation && (cp.audience === "invited" || (invitation.group && cp.group_ids.includes(invitation.group.id)))),
  );

  const has: Record<SectionId, boolean> = {
    countdown: daysLeft !== null && daysLeft > 0,
    live: Boolean(w.live_notice || w.mission),
    thanks: Boolean(c.thankYou),
    story: Boolean(c.story),
    timeline: c.timeline.length > 0,
    ceremony: Boolean(c.ceremony || c.reception),
    schedule: data.schedule.length > 0,
    location: Boolean(w.venue || w.city || c.mapUrl),
    dresscode: Boolean(c.dressCode),
    logistics: Boolean(data.logistics && (data.logistics.accommodation || data.logistics.transport)),
    rsvp: Boolean(invitation || w.open_rsvp),
    gifts: c.gifts.length > 0 || Boolean(c.giftsNote),
    faq: c.faq.length > 0,
    gallery: true,
    together: w.accepting_contributions || data.chapters.some((ch) => ch.entries.length),
    guestbook: w.accepting_contributions || data.guestbook.length > 0,
    capsule: Boolean(w.capsule_open_date),
  };
  const shown = order.filter((id) => has[id]);

  const section = (id: SectionId) => {
    switch (id) {
      case "countdown":
        return (
          <section key={id} className="s-count" aria-label="Contagem regressiva">
            <span className="s-count-n">{daysLeft}</span>
            <span>{daysLeft === 1 ? "dia para o grande dia" : "dias para o grande dia"}</span>
          </section>
        );
      case "live":
        return (
          <section key={id} className="s-band" aria-label="Ao vivo">
            {w.live_notice && (
              <div className="s-card">
                <span className="s-k">Aviso dos noivos</span>
                <p>{w.live_notice}</p>
              </div>
            )}
            {w.mission && (
              <div className="s-card">
                <span className="s-k">Missão de hoje</span>
                <p>{w.mission}</p>
              </div>
            )}
          </section>
        );
      case "thanks":
        return (
          <section key={id} className="s-section s-thanks">
            <h2>Obrigado</h2>
            {paragraphs(c.thankYou).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        );
      case "story":
        return (
          <section key={id} className="s-section s-story" id="story">
            <h2>Nossa história</h2>
            {paragraphs(c.story).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        );
      case "timeline":
        return (
          <section key={id} className="s-section" id="timeline">
            <h2>Linha do tempo</h2>
            <ol className="s-timeline">
              {c.timeline.map((t, i) => (
                <li key={i}>
                  <span className="s-k">{t.date}</span>
                  <h3>{t.title}</h3>
                  {t.text && <p>{t.text}</p>}
                </li>
              ))}
            </ol>
          </section>
        );
      case "ceremony":
        return (
          <section key={id} className="s-section s-two" id="ceremony">
            {c.ceremony && (
              <div>
                <h2>Cerimônia</h2>
                <p>{c.ceremony}</p>
              </div>
            )}
            {c.reception && (
              <div>
                <h2>Recepção</h2>
                <p>{c.reception}</p>
              </div>
            )}
          </section>
        );
      case "schedule":
        return (
          <section key={id} className="s-section" id="schedule">
            <h2>Programação</h2>
            <ScheduleList items={data.schedule} live={phase === "durante"} />
          </section>
        );
      case "location": {
        const map = safeUrl(c.mapUrl);
        return (
          <section key={id} className="s-section" id="location">
            <h2>Como chegar</h2>
            {w.venue && <p className="s-lead">{w.venue}</p>}
            {w.city && <p>{w.city}</p>}
            {data.logistics?.address && <p>{data.logistics.address}</p>}
            {map && (
              <a className="s-btn" href={map} target="_blank" rel="noopener noreferrer">
                Abrir no mapa
              </a>
            )}
          </section>
        );
      }
      case "dresscode":
        return (
          <section key={id} className="s-section" id="dresscode">
            <h2>Dress code</h2>
            <p>{c.dressCode}</p>
          </section>
        );
      case "logistics":
        return (
          <section key={id} className="s-section s-two" id="logistics">
            {data.logistics?.accommodation && (
              <div>
                <h2>Hospedagem</h2>
                <p>{data.logistics.accommodation}</p>
              </div>
            )}
            {data.logistics?.transport && (
              <div>
                <h2>Transporte</h2>
                <p>{data.logistics.transport}</p>
              </div>
            )}
          </section>
        );
      case "rsvp":
        return (
          <section key={id} className="s-section" id="rsvp">
            <h2>Confirme sua presença</h2>
            <RsvpForm weddingId={w.id} invitation={invitation} disabled={disabled} />
          </section>
        );
      case "gifts":
        return (
          <section key={id} className="s-section" id="gifts">
            <h2>Lista de presentes</h2>
            {c.giftsNote && <p className="s-muted">{c.giftsNote}</p>}
            <ul className="s-gifts">
              {c.gifts.map((g, i) => {
                const url = safeUrl(g.url);
                return (
                  <li key={i}>
                    <h3>{g.title}</h3>
                    {g.description && <p>{g.description}</p>}
                    <div className="s-gift-foot">
                      {g.priceCents !== null && <span className="s-price">{formatBRL(g.priceCents)}</span>}
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="s-link">
                          Ver presente
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      case "faq":
        return (
          <section key={id} className="s-section" id="faq">
            <h2>Perguntas frequentes</h2>
            <div className="s-faq">
              {c.faq.map((f, i) => (
                <details key={i}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        );
      case "gallery":
        return (
          <section key={id} className="s-section" id="gallery">
            <h2>{phase === "durante" ? "Fotos da festa" : "Álbum colaborativo"}</h2>
            {data.photos.length ? (
              <div className="s-gallery">
                {data.photos.map((p) => (
                  <figure key={p.id}>
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt={p.caption || `Foto enviada por ${p.uploader_name || "um convidado"}`} loading="lazy" />
                    ) : (
                      <span className="s-tone" style={{ background: p.tone }} aria-hidden="true" />
                    )}
                    {(p.caption || p.uploader_name) && <figcaption>{p.caption || p.uploader_name}</figcaption>}
                  </figure>
                ))}
              </div>
            ) : (
              <p className="s-muted">As fotos aprovadas pelos noivos aparecem aqui.</p>
            )}
            {w.accepting_contributions && <PhotoUpload weddingId={w.id} disabled={disabled} />}
          </section>
        );
      case "together":
        return (
          <section key={id} className="s-section s-together" id="together">
            <h2>Construir Juntos</h2>
            <p className="s-muted">Uma memória feita por todos. Os noivos leem cada contribuição antes de publicar.</p>
            {data.chapters
              .filter((ch) => ch.entries.length)
              .map((ch) => (
                <div className="s-chapter" key={ch.id}>
                  <h3>{ch.title}</h3>
                  {ch.intro && <p className="s-muted">{ch.intro}</p>}
                  <div className="s-entries">
                    {ch.entries.map((e) => (
                      <Entry key={e.id} e={e} />
                    ))}
                  </div>
                </div>
              ))}
            {w.accepting_contributions &&
              (campaigns.length ? (
                <div className="s-campaigns">
                  {campaigns.map((cp) => (
                    <details className="s-campaign" key={cp.id}>
                      <summary>
                        <span className="s-k">{cp.kind === "capsule" ? "Cápsula do tempo" : "Convite dos noivos"}</span>
                        <strong>{cp.title}</strong>
                        {cp.prompt && <span className="s-muted">{cp.prompt}</span>}
                      </summary>
                      <ContributionForm weddingId={w.id} campaign={cp} token={invitation?.token ?? null} disabled={disabled} />
                    </details>
                  ))}
                </div>
              ) : (
                <p className="s-muted">Para participar, abra o link do convite que os noivos enviaram para você.</p>
              ))}
          </section>
        );
      case "guestbook":
        return (
          <section key={id} className="s-section" id="guestbook">
            <h2>Livro de mensagens</h2>
            {data.guestbook.length > 0 && (
              <div className="s-entries">
                {data.guestbook.map((e) => (
                  <Entry key={e.id} e={e} />
                ))}
              </div>
            )}
            {w.accepting_contributions && (
              <details className="s-campaign">
                <summary>
                  <strong>Deixe uma mensagem para os noivos</strong>
                </summary>
                <ContributionForm weddingId={w.id} campaign={null} token={invitation?.token ?? null} disabled={disabled} />
              </details>
            )}
          </section>
        );
      case "capsule": {
        const open = parseDate(w.capsule_open_date);
        const left = open ? daysBetween(today, open) : null;
        return (
          <section key={id} className="s-section s-capsule" id="capsule">
            <span className="s-k">Cápsula do tempo</span>
            <h2>{left !== null && left > 0 ? `Abre em ${left} dias` : "A cápsula foi aberta"}</h2>
            <p>
              {data.capsule?.count ? (data.capsule.count === 1 ? "1 mensagem lacrada. " : `${data.capsule.count} mensagens lacradas. `) : ""}
              Os noivos abrem em {formatLongDate(w.capsule_open_date)}.
            </p>
          </section>
        );
      }
    }
  };

  const nav = shown.filter((id) => NAV[id]);

  return (
    <div className={`site s-layout-${theme.layout} s-nav-${theme.navStyle} s-btn-${theme.buttonStyle}`} style={themeStyle(theme)}>
      {nav.length > 0 && (
        <nav className="s-nav" aria-label="Seções do site">
          {nav.map((id) => (
            <a key={id} href={`#${id}`}>
              {NAV[id]}
            </a>
          ))}
        </nav>
      )}

      <header className="s-hero">
        <div className="s-hero-text">
          {phase === "durante" && <span className="s-live">Ao vivo</span>}
          <Ornament kind={theme.ornament} />
          {c.inviteLine && <p className="s-eyebrow">{c.inviteLine}</p>}
          <h1 className="s-names">
            {w.partner_one || "Noiva"} <span className="s-amp">&amp;</span> {w.partner_two || "Noivo"}
          </h1>
          <p className="s-eyebrow">{[formatLongDate(w.wedding_date), where].filter(Boolean).join(" — ")}</p>
          {c.tagline && <p className="s-tagline">{c.tagline}</p>}
        </div>
        {theme.layout === "split" && (
          <div className="s-hero-media">
            {data.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.coverUrl} alt={names} />
            ) : (
              <Ornament kind={theme.ornament === "none" ? "foliage" : theme.ornament} large />
            )}
          </div>
        )}
        {theme.layout !== "split" && data.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="s-cover" src={data.coverUrl} alt={names} />
        )}
      </header>

      {invitation && (
        <section className="s-invite" aria-label="Seu convite">
          <span className="s-k">Convite para</span>
          <p className="s-lead">{invitation.guest.name}</p>
          {invitation.group?.message && <p>{invitation.group.message}</p>}
        </section>
      )}

      {shown.map(section)}

      <footer className="s-foot">
        <p>
          {names} · feito com Eterna
        </p>
        <p className="s-muted small">
          As fotos e mensagens enviadas só aparecem aqui depois de aprovadas pelos noivos, com a autorização de quem enviou.
        </p>
      </footer>
    </div>
  );
}
