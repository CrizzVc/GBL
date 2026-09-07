import React from 'react';

interface HeroItem {
  id: number;
  title: string;
  rating: string;
  genre: string;
  year: string;
  description: string;
  backdrop: string;
}

interface MultimediaViewProps {
  heroItem: HeroItem;
  heroSlides: HeroItem[];
  activeSlide: number;
  setActiveSlide: (i: number) => void;
  continueWatching: { id: number; title: string; subtitle: string; progress: number }[];
  setNativeView: (view: 'multimedia' | null) => void;
  isHeroPaused: boolean;
  setIsHeroPaused: (p: boolean) => void;
}

const MultimediaView: React.FC<MultimediaViewProps> = ({
  heroItem,
  heroSlides,
  activeSlide,
  setActiveSlide,
  continueWatching,
  setNativeView,
  isHeroPaused,
  setIsHeroPaused,
}) => {
  return (
    <main className="multimedia-view" aria-label="Multimedia">
      <div
        className="multimedia-hero"
        style={{ backgroundImage: `url(${heroItem.backdrop})` }}
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        <div className="multimedia-hero-nav">
          <button type="button" className="multimedia-back" onClick={() => setNativeView(null)}>
            ← Volver a HASHI
          </button>
        </div>

        <div className="multimedia-hero-body" key={heroItem.id}>
          <span className="multimedia-kicker">DESTACADO</span>
          <h1>{heroItem.title}</h1>
          <div className="multimedia-meta">
            <span className="tag">{heroItem.rating}</span>
            <span>{heroItem.genre}</span>
            <span>·</span>
            <span>{heroItem.year}</span>
          </div>
          <p>{heroItem.description}</p>
          <div className="multimedia-actions">
            <button type="button" className="multimedia-primary">Ir al título</button>
            <button type="button" className="multimedia-secondary">Mi lista</button>
          </div>
        </div>

        <div className="multimedia-dots">
          {heroSlides.map((slide, i) => (
            <span
              key={slide.id}
              className={i === activeSlide ? 'is-active' : ''}
              onClick={() => setActiveSlide(i)}
            />
          ))}
        </div>
      </div>

      <section className="multimedia-rail">
        <div className="multimedia-rail-heading">
          <h2>Continuar viendo</h2>
          <span>Próximamente</span>
        </div>
        <div className="multimedia-cards">
          {continueWatching.map((item, index) => (
            <article className={`multimedia-card card-${(index % 5) + 1}`} key={item.id}>
              <div className="multimedia-card-thumb">
                <div className="multimedia-card-progress">
                  <i style={{ width: `${item.progress}%` }} />
                </div>
              </div>
              <p className="multimedia-card-title">{item.title}</p>
              <p className="multimedia-card-subtitle">{item.subtitle}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default MultimediaView;
