"use client";

import DesignWorkspace, { type VersionRow } from "@/components/panel/DesignWorkspace";
import StudioPanel from "@/components/panel/StudioPanel";
import type { RefView } from "@/components/panel/ReferenceUploader";
import type { SiteDesign } from "@/lib/design";
import type { SiteData } from "@/lib/site";
import type { StudioMessage, Wedding } from "@/lib/types";

type Props = {
  wedding: Wedding;
  design: SiteDesign;
  versions: VersionRow[];
  live: Omit<SiteData, "wedding" | "design" | "invitation">;
  refs: RefView[];
  messages: StudioMessage[];
  aiEnabled: boolean;
};

export default function StudioWorkspace({ wedding, design, versions, live, refs, messages, aiEnabled }: Props) {
  return (
    <DesignWorkspace wedding={wedding} initialDesign={design} initialVersions={versions} live={live}>
      {(api) => <StudioPanel api={api} weddingId={wedding.id} refs={refs} initialMessages={messages} aiEnabled={aiEnabled} />}
    </DesignWorkspace>
  );
}
