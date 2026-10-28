"use client";

import DesignWorkspace, { type VersionRow } from "@/components/panel/DesignWorkspace";
import EditorPanel from "@/components/panel/EditorPanel";
import type { SiteDesign } from "@/lib/design";
import type { SiteData } from "@/lib/site";
import type { Wedding } from "@/lib/types";

type Props = {
  wedding: Wedding;
  design: SiteDesign;
  versions: VersionRow[];
  live: Omit<SiteData, "wedding" | "design" | "invitation">;
};

export default function EditorWorkspace({ wedding, design, versions, live }: Props) {
  return (
    <DesignWorkspace wedding={wedding} initialDesign={design} initialVersions={versions} live={live}>
      {(api) => <EditorPanel api={api} />}
    </DesignWorkspace>
  );
}
