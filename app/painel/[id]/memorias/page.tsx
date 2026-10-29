import { headers } from "next/headers";
import QRCode from "qrcode";
import { query } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getOwnedWedding } from "@/lib/panel";
import { capsuleSummary } from "@/lib/site";
import type { Campaign, Chapter, Contribution, GuestGroup, Photo } from "@/lib/types";
import TogetherManager from "../juntos/TogetherManager";
import PhotosManager from "../fotos/PhotosManager";
import MemoriesSwitch from "./MemoriesSwitch";
import MemoriesTabs from "./MemoriesTabs";

export const metadata = { title: "Memórias · Eterna" };

export default async function MemoriasPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const [{ id }, { aba }] = await Promise.all([params, searchParams]);
  const { wedding } = await getOwnedWedding(id);
  const [contribs, chapters, campaigns, groups, photos, capsule] = await Promise.all([
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
    query<Photo>("select * from photos where wedding_id = $1 order by created_at desc", [id]),
    capsuleSummary(wedding),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/c/${wedding.slug}/memorias`;
  const qrSvg = await QRCode.toString(shareUrl, { type: "svg", margin: 1, width: 200, color: { dark: "#22201C", light: "#FFFFFF" } });
  const hasContent = contribs.length > 0 || photos.length > 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="mono">Construir Juntos</span>
          <h1>Nossas memórias</h1>
          <p className="lede">Familiares e amigos enviam fotos, mensagens e lembranças. Vocês revisam tudo antes de aparecer no site.</p>
        </div>
      </header>

      <MemoriesSwitch
        weddingId={id}
        on={wedding.accepting_contributions}
        published={wedding.published}
        shareUrl={shareUrl}
        qrSvg={qrSvg}
        capsuleDate={wedding.capsule_open_date}
      />

      {(wedding.accepting_contributions || hasContent) && (
        <MemoriesTabs
          initial={aba === "fotos" ? "fotos" : "mensagens"}
          pending={{ mensagens: contribs.filter((c) => c.status === "pending").length, fotos: photos.filter((p) => p.status === "pending").length }}
          messages={
            <TogetherManager
              weddingId={id}
              initialContributions={contribs.map((c) => ({ ...c, photoUrl: fileUrl(c.photo_file_id) }))}
              initialChapters={chapters}
              initialCampaigns={campaigns}
              groups={groups}
              capsule={capsule}
            />
          }
          photos={<PhotosManager weddingId={id} initialPhotos={photos.map((p) => ({ ...p, url: fileUrl(p.file_id) }))} />}
        />
      )}
    </div>
  );
}
