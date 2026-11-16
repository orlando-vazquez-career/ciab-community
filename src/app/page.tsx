const principles = [
  {
    number: "01",
    title: "Fuentes con contexto",
    description: "Noticias de IA con origen y evidencia rastreables.",
  },
  {
    number: "02",
    title: "Conversación abierta",
    description: "Un espacio para debatir ideas con respeto y criterio.",
  },
  {
    number: "03",
    title: "Aportes reconocidos",
    description: "La calidad de la participación importa más que el ruido.",
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a aria-label="CIAB Community, inicio" className="brand" href="#inicio">
          <span aria-hidden="true" className="brand-mark">C</span>
          <span className="brand-name">
            <strong>CIAB</strong>
            <span>COMMUNITY</span>
          </span>
        </a>
        <nav aria-label="Navegación principal" className="main-nav">
          <a href="#proposito">El propósito</a>
          <a href="#estado">Estado del proyecto</a>
          <span className="nav-location">BOLIVIA · IA</span>
        </nav>
      </header>

      <section aria-labelledby="hero-title" className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Una comunidad en construcción</p>
          <h1 id="hero-title">La IA se entiende <em>conversando.</em></h1>
          <p className="hero-description">
            Un punto de encuentro boliviano para compartir información confiable,
            debatir inteligencia artificial y reconocer las buenas contribuciones.
          </p>
          <a className="text-link" href="#proposito">
            Conoce la idea <span aria-hidden="true">↘</span>
          </a>
        </div>

        <aside aria-label="Principio de la comunidad" className="hero-note">
          <span className="note-index">CIAB / 01</span>
          <p>Menos ruido.<br /><strong>Más criterio.</strong></p>
          <span className="note-rule" />
          <span className="note-caption">Cámara de Inteligencia Artificial Boliviana</span>
        </aside>
      </section>

      <section aria-labelledby="purpose-title" className="purpose" id="proposito">
        <div className="section-heading">
          <p className="eyebrow">01 — El propósito</p>
          <h2 id="purpose-title">Información que<br />abre conversación.</h2>
        </div>
        <div className="purpose-content">
          <p className="purpose-lead">
            La tecnología avanza rápido. Entender su impacto requiere buenas
            fuentes, perspectivas distintas y una comunidad que aporte con intención.
          </p>
          <div className="principle-list">
            {principles.map((principle) => (
              <article className="principle" key={principle.number}>
                <span className="principle-number">{principle.number}</span>
                <div>
                  <h3>{principle.title}</h3>
                  <p>{principle.description}</p>
                </div>
                <span aria-hidden="true" className="principle-arrow">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="status-title" className="status-panel" id="estado">
        <div className="status-symbol" aria-hidden="true">✳</div>
        <div>
          <p className="eyebrow">Estado de la plataforma</p>
          <h2 id="status-title">Estamos preparando la casa.</h2>
          <p>
            Esta es la base inicial del proyecto. El registro, las publicaciones
            y los comentarios todavía no están habilitados.
          </p>
        </div>
        <span className="status-tag">FASE 01 / BASE WEB</span>
      </section>

      <footer className="site-footer">
        <a className="footer-brand" href="#inicio">CIAB COMMUNITY</a>
        <span>Una iniciativa de la Cámara de Inteligencia Artificial Boliviana</span>
        <a href="#inicio">Volver arriba ↑</a>
      </footer>
    </main>
  );
}
