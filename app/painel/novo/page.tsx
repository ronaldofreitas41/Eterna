import { requireUser } from "@/lib/auth";
import AppHeader from "../AppHeader";
import Onboarding from "./Onboarding";

export const metadata = { title: "Novo casamento · Eterna" };

export default async function NovoPage() {
  const user = await requireUser();
  return (
    <div className="wrap">
      <AppHeader email={user.email} />
      <Onboarding />
    </div>
  );
}
