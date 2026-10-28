import "server-only";
import { parseDesign } from "./design";
import { one, query } from "./db";
import { getOwnedWedding } from "./panel";
import { loadLiveData } from "./site";
import type { SiteVersion, WeddingDraft } from "./types";

type VersionRow = Pick<SiteVersion, "id" | "label" | "source" | "created_at" | "snapshot">;

/** Tudo o que o estúdio e o editor precisam: rascunho, versões e dados ao vivo para a prévia. */
export async function loadWorkspace(id: string) {
  const { wedding } = await getOwnedWedding(id);
  const [draft, versions, live] = await Promise.all([
    one<WeddingDraft>("select * from wedding_drafts where wedding_id = $1", [id]),
    query<VersionRow>("select id, label, source, created_at, snapshot from site_versions where wedding_id = $1 order by created_at desc limit 40", [id]),
    loadLiveData(wedding, { includePrivateLogistics: true }),
  ]);

  // Garante que a versão publicada esteja na lista, mesmo se for antiga.
  let list = versions;
  if (wedding.published_version_id && !list.some((v) => v.id === wedding.published_version_id)) {
    const v = await one<VersionRow>("select id, label, source, created_at, snapshot from site_versions where id = $1", [wedding.published_version_id]);
    if (v) list = [...list, v];
  }

  return { wedding, style: draft?.style ?? "", design: parseDesign(draft?.design), versions: list, live };
}
