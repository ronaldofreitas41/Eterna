import { one, query } from "@/lib/db";
import { getOwnedWedding } from "@/lib/panel";
import type { Logistics, ScheduleItem } from "@/lib/types";
import ScheduleManager from "./ScheduleManager";

export const metadata = { title: "Programação · Eterna" };

export default async function ProgramacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await getOwnedWedding(id);
  const [items, logistics] = await Promise.all([
    query<ScheduleItem>("select * from schedule_items where wedding_id = $1 order by day nulls first, starts_at, position", [id]),
    one<Logistics>("select * from wedding_logistics where wedding_id = $1", [id]),
  ]);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Programação e logística</h1>
          <p className="lede">A programação aparece para todos. Hospedagem, transporte e endereço ficam protegidos até vocês liberarem.</p>
        </div>
      </header>
      <ScheduleManager
        weddingId={id}
        weddingDate={wedding.wedding_date}
        initialItems={items}
        initialLogistics={logistics ?? { wedding_id: id, address: "", accommodation: "", transport: "" }}
        initialPublic={wedding.logistics_public}
      />
    </div>
  );
}
