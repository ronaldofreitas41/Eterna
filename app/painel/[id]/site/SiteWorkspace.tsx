"use client";

import DesignWorkspace, { type VersionRow } from "@/components/panel/DesignWorkspace";
import SitePanel from "@/components/panel/SitePanel";
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
  initialTab?: "pedir" | "textos" | "aparencia" | "presentes" | "secoes";
};

export default function SiteWorkspace({ wedding, design, versions, live, refs, messages, aiEnabled, initialTab }: Props) {
  return (
    <DesignWorkspace wedding={wedding} initialDesign={design} initialVersions={versions} live={live}>
      {(api) => (
        <SitePanel api={api} weddingId={wedding.id} refs={refs} messages={messages} aiEnabled={aiEnabled} coverUrl={live.coverUrl} initialTab={initialTab} />
      )}
    </DesignWorkspace>
  );
}
