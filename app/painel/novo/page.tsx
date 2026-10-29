import { requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { isUuid } from "@/lib/panel";
import type { DesignReference, Wedding, WeddingDraft } from "@/lib/types";
import AppHeader from "../AppHeader";
import Onboarding, { type Resume } from "./Onboarding";

export const metadata = { title: "Novo casamento · Eterna" };

/** Com ?casamento=<id>, retoma a criação já começada (ao recarregar a página, não cria outro casamento). */
export default async function NovoPage({ searchParams }: { searchParams: Promise<{ casamento?: string }> }) {
  const user = await requireUser();
  const { casamento } = await searchParams;

  let resume: Resume | undefined;
  if (isUuid(casamento)) {
    const wedding = await one<Wedding>("select * from weddings where id = $1 and owner_id = $2", [casamento, user.id]);
    if (wedding) {
      const [draft, refs] = await Promise.all([
        one<WeddingDraft>("select * from wedding_drafts where wedding_id = $1", [wedding.id]),
        query<DesignReference>("select * from design_references where wedding_id = $1 order by position, created_at", [wedding.id]),
      ]);
      resume = {
        id: wedding.id,
        info: { partnerOne: wedding.partner_one, partnerTwo: wedding.partner_two, date: wedding.wedding_date, venue: wedding.venue, city: wedding.city },
        dream: draft?.style ?? "",
        refs: refs.map((r) => ({ id: r.id, fileId: r.file_id, url: r.url, note: r.note, displayUrl: r.file_id ? fileUrl(r.file_id) : r.url })),
      };
    }
  }

  return (
    <div className="wrap">
      <AppHeader email={user.email} />
      <Onboarding resume={resume} />
    </div>
  );
}
