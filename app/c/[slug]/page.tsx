import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WeddingSite from "@/components/site/WeddingSite";
import { isDatabaseConfigured, one } from "@/lib/db";
import { formatLongDate, resolvePhase } from "@/lib/phase";
import { loadPublicSite } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ convite?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isDatabaseConfigured()) return { title: "Eterna" };
  const w = await one<{ partner_one: string; partner_two: string; wedding_date: string | null }>(
    "select partner_one, partner_two, wedding_date from weddings where slug = $1 and published",
    [slug],
  );
  if (!w) return { title: "Site não encontrado · Eterna" };
  return {
    title: `${w.partner_one} & ${w.partner_two}`,
    description: `Casamento de ${w.partner_one} e ${w.partner_two}${w.wedding_date ? ` em ${formatLongDate(w.wedding_date)}` : ""}.`,
    robots: { index: false },
  };
}

export default async function PublicWeddingPage({ params, searchParams }: Props) {
  const [{ slug }, { convite }] = await Promise.all([params, searchParams]);
  if (!isDatabaseConfigured()) notFound();
  const data = await loadPublicSite(slug, convite ?? null);
  if (!data) notFound();

  const today = new Date();
  return (
    <main className="public-site">
      {data.wedding.is_demo && <p className="demo-ribbon">Casamento de demonstração · dados fictícios</p>}
      <WeddingSite data={data} phase={resolvePhase(data.wedding.phase, data.wedding.wedding_date, today)} mode="live" today={today} />
    </main>
  );
}
