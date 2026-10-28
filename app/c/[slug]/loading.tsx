// Carregamento do site do casal: um convite em branco, sem cores do tema (ainda não carregado).
export default function Loading() {
  return (
    <main className="site-loading" aria-busy="true" aria-label="Carregando o site">
      <span className="sk sk-line short" />
      <span className="sk sk-title center" />
      <span className="sk sk-line" />
    </main>
  );
}
