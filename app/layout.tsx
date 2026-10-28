import type { Metadata, Viewport } from "next";
import {
  Bodoni_Moda,
  Cormorant_Garamond,
  Figtree,
  IBM_Plex_Mono,
  Instrument_Sans,
  Italiana,
  Lora,
  Marcellus,
  Pinyon_Script,
} from "next/font/google";
import "./globals.css";

// Bodoni e Instrument Sans são a identidade da Eterna; as demais servem aos sites dos casais.
const display = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const script = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-script", preload: false });
const thin = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-thin", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", preload: false });
const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus", preload: false });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", preload: false });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", preload: false });

export const metadata: Metadata = {
  title: { default: "Eterna · sites de casamento com IA", template: "%s" },
  description: "A história de vocês, construída por todos. Crie um site de casamento único com IA, viva o dia com os convidados e preserve as memórias.",
};

export const viewport: Viewport = { themeColor: "#FBF8F2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [display, body, mono, script, thin, cormorant, marcellus, lora, figtree].map((f) => f.variable).join(" ");
  return (
    <html lang="pt-BR" className={fonts}>
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <div id="conteudo">{children}</div>
      </body>
    </html>
  );
}
