import Link from "next/link";
import { demoSiteData } from "@/lib/demo-site";
import ExampleViewer from "./ExampleViewer";

export const metadata = {
  title: "Helena & Rafael · exemplo",
  description: "Um site de casamento de demonstração da Eterna, antes, durante e depois do casamento.",
};

export default function ExemploPage() {
  return (
    <main>
      <div className="example-bar">
        <Link href="/" className="brand">
          Eterna
        </Link>
        <span className="mono">Casamento fictício de demonstração · formulários desativados</span>
        <Link href="/entrar?modo=criar" className="btn primary small">
          Criar meu casamento
        </Link>
      </div>
      <ExampleViewer data={demoSiteData()} />
    </main>
  );
}
