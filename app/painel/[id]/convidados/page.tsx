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
            Organizem por grupos. Cada convidado recebe um link próprio, com as informações e permissões do grupo dele.
          </p>
        </div>
      </header>
      {!wedding.published && (
        <p className="notice">Os links de convite só funcionam depois que o site for publicado (em Editor do site → Publicar).</p>
      )}
      <GuestsManager
        weddingId={id}
        slug={wedding.slug}
        initialGroups={groups}
        initialGuests={guests}
        initialRsvps={rsvps}
      />
    </div>
  );
}
