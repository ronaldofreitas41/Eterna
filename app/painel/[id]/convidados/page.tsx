import { query } from "@/lib/db";
import { getOwnedWedding } from "@/lib/panel";
import type { Guest, GuestGroup, Rsvp } from "@/lib/types";
import GuestsManager from "./GuestsManager";

export const metadata = { title: "Convidados · Eterna" };

export default async function ConvidadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await getOwnedWedding(id);
  const [groups, guests, rsvps] = await Promise.all([
    query<GuestGroup>("select * from guest_groups where wedding_id = $1 order by position, name", [id]),
    query<Guest>("select * from guests where wedding_id = $1 order by name", [id]),
    query<Rsvp>("select * from rsvps where wedding_id = $1 order by created_at desc", [id]),
  ]);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Convidados</h1>
          <p className="lede">
            Compartilhem o link do site e acompanhem quem confirmou, quem não poderá ir e quem ainda não respondeu.
          </p>
        </div>
      </header>
      <GuestsManager
        weddingId={id}
        slug={wedding.slug}
        published={wedding.published}
        openRsvp={wedding.open_rsvp}
        initialGroups={groups}
        initialGuests={guests}
        initialRsvps={rsvps}
      />
    </div>
  );
}
