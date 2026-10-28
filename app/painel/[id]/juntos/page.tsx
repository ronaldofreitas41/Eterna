import { query } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getOwnedWedding } from "@/lib/panel";
import { capsuleSummary } from "@/lib/site";
import type { Campaign, Chapter, Contribution, GuestGroup } from "@/lib/types";
import TogetherManager from "./TogetherManager";

export const metadata = { title: "Construir Juntos · Eterna" };

export default async function JuntosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await getOwnedWedding(id);
  const [contribs, chapters, campaigns, groups, capsule] = await Promise.all([
    // Mensagens da cápsula só aparecem para os noivos depois da data de abertura.
    query<Contribution>(
      `select c.* from contributions c join weddings w on w.id = c.wedding_id
        where c.wedding_id = $1 and (c.status <> 'capsule' or (w.capsule_open_date is not null and w.capsule_open_date <= current_date))
        order by c.created_at desc`,
      [id],
    ),
    query<Chapter>("select * from story_chapters where wedding_id = $1 order by position, title", [id]),
    query<Campaign>("select * from campaigns where wedding_id = $1 order by position, created_at", [id]),
    query<GuestGroup>("select * from guest_groups where wedding_id = $1 order by position, name", [id]),
    capsuleSummary(wedding),
  ]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="mono">Memória coletiva</span>
          <h1>Construir Juntos</h1>
          <p className="lede">
            Convidem familiares e amigos para contar a história de vocês. Tudo chega aqui primeiro e só aparece no site depois que
            vocês aprovarem.
          </p>
        </div>
      </header>
      {!wedding.accepting_contributions && <p className="notice">O recebimento de contribuições está desligado em Fases e configurações.</p>}
      <TogetherManager
        weddingId={id}
        initialContributions={contribs.map((c) => ({ ...c, photoUrl: fileUrl(c.photo_file_id) }))}
        initialChapters={chapters}
        initialCampaigns={campaigns}
        groups={groups}
        capsule={capsule}
      />
    </div>
  );
}
