import { headers } from "next/headers";
import QRCode from "qrcode";
import { getOwnedWedding } from "@/lib/panel";
import { resolvePhase } from "@/lib/phase";
import SettingsManager from "./SettingsManager";

export const metadata = { title: "Fases e configurações · Eterna" };

export default async function ConfiguracoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await getOwnedWedding(id);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const publicUrl = `${proto}://${host}/c/${wedding.slug}`;
  const qrSvg = await QRCode.toString(publicUrl, { type: "svg", margin: 1, width: 220, color: { dark: "#22201C", light: "#FFFFFF" } });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Fases e configurações</h1>
          <p className="lede">Controlem em que momento o site está, o que os convidados podem enviar e os dados do casamento.</p>
        </div>
      </header>
      <SettingsManager wedding={wedding} autoPhase={resolvePhase("auto", wedding.wedding_date)} publicUrl={publicUrl} qrSvg={qrSvg} />
    </div>
  );
}
