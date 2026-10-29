import { isAiConfigured } from "@/lib/ai";
import { query } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import type { DesignReference, StudioMessage } from "@/lib/types";
import { loadWorkspace } from "@/lib/workspace-data";
import SiteWorkspace from "./SiteWorkspace";

export const metadata = { title: "Meu site · Eterna" };

const TABS = ["pedir", "textos", "aparencia", "presentes", "secoes"] as const;

export default async function MeuSitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const [{ id }, { aba }] = await Promise.all([params, searchParams]);
  const { wedding, design, versions, live } = await loadWorkspace(id);
  const [refs, messages] = await Promise.all([
    query<DesignReference>("select * from design_references where wedding_id = $1 order by position, created_at", [id]),
    query<StudioMessage>("select * from (select * from studio_messages where wedding_id = $1 order by created_at desc limit 60) m order by created_at", [id]),
  ]);
  return (
    <SiteWorkspace
      wedding={wedding}
      design={design}
      versions={versions}
      live={live}
      refs={refs.map((r) => ({ id: r.id, fileId: r.file_id, url: r.url, note: r.note, displayUrl: r.file_id ? fileUrl(r.file_id) : r.url }))}
      messages={messages}
      aiEnabled={isAiConfigured()}
      initialTab={TABS.find((t) => t === aba)}
    />
  );
}
