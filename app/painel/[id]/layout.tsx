import { one } from "@/lib/db";
import { getOwnedWedding } from "@/lib/panel";
import PanelNav from "@/components/panel/PanelNav";
import LiveSync from "@/components/LiveSync";

export default async function WeddingPanelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, wedding } = await getOwnedWedding(id);
  const pending = await one<{ juntos: number; fotos: number }>(
    `select (select count(*)::int from contributions where wedding_id = $1 and status = 'pending') as juntos,
            (select count(*)::int from photos where wedding_id = $1 and status = 'pending') as fotos`,
    [id],
  );

  return (
    <div className="panel">
      <PanelNav
        id={id}
        names={`${wedding.partner_one} & ${wedding.partner_two}`}
        slug={wedding.slug}
        published={wedding.published}
        isDemo={wedding.is_demo}
        email={user.email}
        pending={pending ?? { juntos: 0, fotos: 0 }}
      />
      <main className="panel-main">{children}</main>
      <LiveSync weddingId={id} revision={wedding.revision} />
    </div>
  );
}
