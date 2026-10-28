import { isAiConfigured } from "@/lib/ai";
import { query } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import type { DesignReference, StudioMessage } from "@/lib/types";
import { loadWorkspace } from "@/lib/workspace-data";
import StudioWorkspace from "./StudioWorkspace";

export const metadata = { title: "Estúdio criativo · Eterna" };

export default async function EstudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding, design, versions, live } = await loadWorkspace(id);
  const [refs, messages] = await Promise.all([
    query<DesignReference>("select * from design_references where wedding_id = $1 order by position, created_at", [id]),
    query<StudioMessage>("select * from (select * from studio_messages where wedding_id = $1 order by created_at desc limit 60) m order by created_at", [id]),
  ]);

  return (
    <StudioWorkspace
      wedding={wedding}
      design={design}
      versions={versions}
      live={live}
      refs={refs.map((r) => ({ id: r.id, fileId: r.file_id, url: r.url, note: r.note, displayUrl: r.file_id ? fileUrl(r.file_id) : r.url }))}
      messages={messages}
      aiEnabled={isAiConfigured()}
    />
  );
}
