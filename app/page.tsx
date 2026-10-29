import Link from "next/link";
import HeroDemo from "@/components/landing/HeroDemo";
import { demoSiteData } from "@/lib/demo-site";
import { formatBRL } from "@/lib/design";
import { PLANS, PLANS_ARE_DEMO } from "@/lib/plans";
import { PRESETS } from "@/lib/presets";
import { DISPLAY_FONTS } from "@/lib/theme";

const STEPS = [
  { t: "Imaginem", d: "Contem como sonham o casamento, em palavras, e enviem as imagens que guardaram no Pinterest, no Instagram ou no celular." },
  { t: "Criem", d: "O estúdio transforma tudo numa identidade visual aplicada ao site inteiro. Vocês ajustam conversando ou no editor." },
  { t: "Compartilhem", d: "Cada convidado recebe um convite próprio, com as informações do grupo dele. No dia, um QR Code abre o site ao vivo." },
  { t: "Preservem", d: "Depois da festa, o site vira álbum, livro de mensagens e cápsula do tempo, construídos por todos." },
];

const FAQ = [
  {
    q: "Precisamos saber design ou programação?",
    a: "Não. Vocês descrevem o que querem e escolhem entre propostas. Quem quiser detalhar pode ajustar cores, fontes, textos e a ordem das seções no editor.",
  },
  {
    q: "A IA publica coisas sem a gente ver?",
    a: "Não. As propostas do estúdio aparecem na prévia e só são aplicadas quando vocês escolhem. O site público só muda quando vocês publicam. Contribuições de convidados ficam privadas até serem aprovadas.",
  },
  {
    q: "Os convidados precisam criar conta?",
    a: "Não. Eles acessam pelo link do site ou pelo convite individual. O convite individual libera as informações do grupo, como hospedagem e transporte, quando vocês autorizarem.",
  },
  {
    q: "E a privacidade dos nossos dados e dos convidados?",
    a: "Cada casal só acessa os próprios dados. Endereço, hospedagem e transporte não aparecem publicamente sem autorização. Quem envia fotos e mensagens autoriza o uso no envio, e vocês podem exportar ou excluir tudo quando quiserem.",
  },
  {
    q: "Como funciona a cápsula do tempo?",
    a: "Os convidados escrevem mensagens para uma data futura, como o primeiro aniversário de casamento. Elas ficam lacradas até a data, inclusive para vocês.",
  },
  {
    q: "A Eterna cobra pelos presentes?",
    a: "Não. Os convidados presenteiam por Pix, direto na conta de vocês, ou pelas lojas que vocês escolherem. O dinheiro não passa pela Eterna e não há taxa.",
  },
];

export default function Home() {
  const demo = demoSiteData();
  return (
    <div className="landing">
      <header className="l-mast wrap">
        <Link href="/" className="brand">
          Eterna
        </Link>
        <nav aria-label="Principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#estudio">Estúdio</a>
          <a href="#convidados">Convidados</a>
          <Link href="/planos">Planos</Link>
          <Link href="/entrar" className="btn ghost small">
            Entrar
          </Link>
        </nav>
      </header>

      <section className="l-hero wrap">
        <div className="l-hero-text">
          <span className="eyebrow">Sites de casamento com um assistente de criação</span>
          <h1>Seu casamento merece uma história só de vocês.</h1>
          <p className="lede">Imagine, personalize e compartilhe cada detalhe do seu grande dia. O Eterna transforma suas ideias em um site de casamento único.</p>
          <div className="row-actions">
            <Link href="/entrar?modo=criar" className="btn primary large">
              Criar meu site
            </Link>
            <Link href="/exemplo" className="text-link">
              Ver um site de exemplo
            </Link>
          </div>
        </div>
        <HeroDemo data={demo} />
      </section>

      <section className="l-section wrap" id="como-funciona">
        <span className="eyebrow">Como funciona</span>
        <h2>Imaginem, criem, compartilhem e preservem</h2>
        <ol className="l-steps">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <span className="l-step-n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="l-section l-band" id="estudio">
        <div className="wrap l-split">
          <div>
            <span className="eyebrow">Estúdio criativo com IA</span>
            <h2>Conversem com o estúdio. O site muda na hora.</h2>
            <p className="lede">
              O estúdio não é um chat que só responde. Cada pedido vira propostas aplicadas à prévia do site: cores, tipografia, composição
              e textos. Vocês comparam duas versões, travam o que já aprovaram e voltam atrás quando quiserem.
            </p>
            <ul className="l-list">
              <li>“Deixe o site mais minimalista.”</li>
              <li>“Use as cores desta imagem.”</li>
              <li>“Mantenha a tipografia, mas mude a composição.”</li>
              <li>“Volte para a versão anterior.”</li>
            </ul>
          </div>
          <div className="l-chat" aria-label="Exemplo de conversa">
            <div className="bubble user">
              <span className="who">Vocês</span>
              <p>Quero fundo marfim, verde sálvia, flores delicadas e nossa história como linha do tempo. Sofisticado e emocional.</p>
            </div>
            <div className="bubble assistant">
              <span className="who">Estúdio</span>
              <p>Preparei duas propostas. A primeira usa Bodoni com folhagens finas; a segunda, uma composição editorial com a linha do tempo logo após a capa.</p>
              <div className="proposals">
                {[PRESETS[0], PRESETS[4]].map((p) => (
                  <div className="proposal" key={p.id}>
                    <span className="mini-swatch">
                      {Object.values(p.theme.palette).map((c, k) => (
                        <i key={k} style={{ background: c }} />
                      ))}
                    </span>
                    <strong>{p.name}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="l-section wrap l-split reverse">
        <div className="l-refs" aria-hidden="true">
          {["#E6DCC9", "#B9C8B4", "#F3EEE4", "#8DA58F"].map((c, i) => (
            <span key={c} className={`l-ref r${i}`} style={{ background: c }} />
          ))}
          <span className="l-palette">
            {Object.values(PRESETS[0].theme.palette).map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
        </div>
        <div>
          <span className="eyebrow">Personalização a partir de imagens</span>
          <h2>As referências de vocês viram um sistema visual</h2>
          <p className="lede">
            Enviem fotos de convites, flores, vestidos e decoração. A Eterna lê as cores e o estilo das imagens e aplica a mesma identidade à
            capa, ao convite, à programação, ao RSVP e à galeria. Dá para pedir o convite de uma referência, o menu de outra e as cores de
            uma terceira.
          </p>
        </div>
      </section>

      <section className="l-section l-band" id="convidados">
        <div className="wrap">
          <span className="eyebrow">Casamento Vivo</span>
          <h2>Um site que acompanha cada fase do casamento</h2>
          <div className="l-phases">
            <div>
              <h3>Antes</h3>
              <p>História, contagem regressiva, convites individuais, confirmação de presença, programação e logística por grupo.</p>
            </div>
            <div>
              <h3>Durante</h3>
              <p>QR Code nas mesas, avisos em tempo real, programação ao vivo, missões dos noivos e fotos dos convidados com moderação.</p>
            </div>
            <div>
              <h3>Depois</h3>
              <p>Agradecimento, álbum colaborativo, livro de mensagens e a cápsula do tempo para abrir no aniversário de casamento.</p>
            </div>
          </div>
          <p className="muted">A fase muda pela data ou quando vocês quiserem, e sempre pode ser corrigida.</p>
        </div>
      </section>

      <section className="l-section wrap l-split">
        <div>
          <span className="eyebrow">Construir Juntos</span>
          <h2>A história de vocês, construída por todos</h2>
          <p className="lede">
            Convidem familiares e amigos para contar lembranças, enviar fotos antigas e deixar conselhos. A IA sugere em qual capítulo cada
            uma se encaixa e avisa quando algo pode constranger. Nada aparece sem a aprovação de vocês.
          </p>
        </div>
        <div className="l-album" aria-label="Exemplo de lembranças">
          <figure>
            <blockquote>“Eu estava atrás deles na fila. Dez minutos depois estavam dividindo um pão de queijo.”</blockquote>
            <figcaption>Bia · amiga da faculdade</figcaption>
          </figure>
          <figure>
            <blockquote>“Nunca durmam brigados. E quem cozinha não lava a louça.”</blockquote>
            <figcaption>Vó Cida</figcaption>
          </figure>
          <figure className="sealed">
            <span className="mono">Cápsula do tempo</span>
            <blockquote>18 mensagens lacradas até 15 de maio de 2028</blockquote>
          </figure>
        </div>
      </section>

      <section className="l-section wrap" id="galeria">
        <span className="eyebrow">Galeria de experiências</span>
        <h2>Pontos de partida, não moldes</h2>
        <p className="muted">Estilos de demonstração. Cada casal transforma o seu em algo próprio no estúdio.</p>
        <div className="l-gallery">
          {PRESETS.map((p) => (
            <article key={p.id} className="l-site" style={{ background: p.theme.palette.background, color: p.theme.palette.ink }}>
              <span className="l-site-k" style={{ color: p.theme.palette.muted }}>
                {p.name}
              </span>
              <strong style={{ fontFamily: DISPLAY_FONTS[p.theme.displayFont].css }}>Ana &amp; Luiz</strong>
              <span className="l-site-line" style={{ background: p.theme.palette.accent }} />
              <span className="l-site-k" style={{ color: p.theme.palette.muted }}>
                {p.description}
              </span>
            </article>
          ))}
        </div>
        <Link href="/exemplo" className="btn ghost">
          Ver o site completo de exemplo
        </Link>
      </section>

      <section className="l-section l-band" id="planos">
        <div className="wrap">
          <span className="eyebrow">Planos</span>
          <h2>Comecem de graça, cresçam quando quiserem</h2>
          {PLANS_ARE_DEMO && <p className="muted">Valores de demonstração. Nenhuma cobrança é feita nesta versão.</p>}
          <div className="plans">
            {PLANS.map((p) => (
              <article key={p.id} className={`plan${p.id === "premium" ? " featured" : ""}`}>
                <h3>{p.name}</h3>
                <p className="plan-price">
                  {p.priceCents === 0 ? "Grátis" : formatBRL(p.priceCents)}
                  <small> {p.period}</small>
                </p>
                <p className="muted">{p.pitch}</p>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <Link href="/planos" className="text-link">
            Comparar planos em detalhe
          </Link>
        </div>
      </section>

      <section className="l-section wrap" id="perguntas">
        <span className="eyebrow">Perguntas frequentes</span>
        <h2>O que os casais costumam perguntar</h2>
        <div className="l-faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="l-cta">
        <div className="wrap">
          <h2>Comecem a história de vocês hoje</h2>
          <p className="lede">Em poucos minutos vocês veem a primeira versão do site. O resto fica no tempo de vocês.</p>
          <Link href="/entrar?modo=criar" className="btn primary">
            Criar meu site
          </Link>
        </div>
      </section>

      <footer className="l-foot wrap">
        <span className="brand">Eterna</span>
        <span className="muted small">Casais, nomes e mensagens desta página são exemplos fictícios.</span>
        <nav aria-label="Rodapé">
          <Link href="/planos">Planos</Link>
          <Link href="/exemplo">Exemplo</Link>
          <Link href="/entrar">Entrar</Link>
        </nav>
      </footer>
    </div>
  );
}
