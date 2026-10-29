import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/db";
import { loadPublicSite } from "@/lib/site";
import { themeStyle } from "@/lib/theme";
import GuestContribute from "./GuestContribute";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ convite?: string }> };

export const metadata: Metadata = { title: "Enviar uma memória", robots: { index: false } };

/** Página que o QR Code abre: o convidado escolhe como contribuir e envia, sem cadastro. */
export default async function MemoriasConvidadoPage({ params, searchParams }: Props) {
  const [{ slug }, { convite }] = await Promise.all([params, searchParams]);
  if (!isDatabaseConfigured()) notFound();
  const data = await loadPublicSite(slug, convite ?? null);
  if (!data) notFound();
  const { wedding: w, invitation } = data;
  const names = `${w.partner_one} & ${w.partner_two}`;

  const campaigns = data.campaigns.filter(
    (cp) => cp.audience === "everyone" || (invitation && (cp.audience === "invited" || (invitation.group && cp.group_ids.includes(invitation.group.id)))),
  );

  return (
    <main className="site guest-page" style={themeStyle(data.design.theme)}>
      <header className="guest-head">
        <p className="s-eyebrow">Memórias de</p>
        <h1 className="s-names">{names}</h1>
        {w.accepting_contributions ? (
          <p className="s-tagline">Escolham como querem fazer parte dessa história. Os noivos leem tudo antes de publicar.</p>
        ) : (
          <p className="s-tagline">O envio de memórias está fechado no momento. Obrigado pelo carinho!</p>
        )}
      </header>
      {w.accepting_contributions && <GuestContribute weddingId={w.id} campaigns={campaigns} token={invitation?.token ?? null} />}
      <footer className="s-foot">
        <a href={`/c/${w.slug}${convite ? `?convite=${encodeURIComponent(convite)}` : ""}`}>Ver o site do casamento</a>
      </footer>
    </main>
  );
}
