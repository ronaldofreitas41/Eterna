import { query } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getOwnedWedding } from "@/lib/panel";
import type { Photo } from "@/lib/types";
import PhotosManager from "./PhotosManager";

export const metadata = { title: "Fotos · Eterna" };

export default async function FotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await getOwnedWedding(id);
  const photos = await query<Photo>("select * from photos where wedding_id = $1 order by created_at desc", [id]);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Fotos</h1>
          <p className="lede">A galeria colaborativa só mostra o que vocês aprovarem. Quem envia autoriza a publicação no momento do envio.</p>
        </div>
      </header>
      <PhotosManager weddingId={id} initialPhotos={photos.map((p) => ({ ...p, url: fileUrl(p.file_id) }))} initialCover={fileUrl(wedding.cover_file_id)} />
    </div>
  );
}
