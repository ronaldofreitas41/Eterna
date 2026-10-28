// Esqueleto das telas do painel enquanto os dados chegam (o menu lateral continua visível).
export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Carregando">
      <div className="skeleton-head">
        <span className="sk sk-line short" />
        <span className="sk sk-title" />
        <span className="sk sk-line" />
      </div>
      <div className="stats">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sk sk-card" />
        ))}
      </div>
      <div className="overview-grid">
        <span className="sk sk-block" />
        <span className="sk sk-block" />
      </div>
    </div>
  );
}
