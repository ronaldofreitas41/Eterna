export default function Loading() {
  return (
    <div className="wrap page" aria-busy="true" aria-label="Carregando">
      <div className="skeleton-head">
        <span className="sk sk-title" />
      </div>
      {[0, 1].map((i) => (
        <span key={i} className="sk sk-card" />
      ))}
    </div>
  );
}
