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
  profileAvatar: string;
  profileName: string;
  onProfileClick: () => void;
  focusedSection: 'hero' | 'continue';
  continueWatchingIndex: number;
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
  profileAvatar,
  profileName,
  onProfileClick,
  focusedSection,
  continueWatchingIndex,
}) => {
  const isContinueFocused = focusedSection === 'continue';

  return (
    <main className="multimedia-view" aria-label="Multimedia">
      <div
        className={`multimedia-hero ${isContinueFocused ? 'is-collapsed' : ''}`}
        style={{ backgroundImage: `url(${heroItem.backdrop})` }}
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        <div className="multimedia-hero-nav">
          <div className="user-avatar" onClick={onProfileClick} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            <img
              src={profileAvatar}
              alt="Foto de perfil"
              className="user-avatar-img"
              draggable={false}
            />
          </div>
          <div className="header-greeting">
            <span className="header-greeting-name">{profileName}</span>
          </div>
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
          <p className={`multimedia-description ${isContinueFocused ? 'is-hidden' : ''}`}>
            {heroItem.description}
          </p>
          {/* <div className={`multimedia-actions ${isContinueFocused ? 'is-hidden' : ''}`}>
            <button type="button" className="multimedia-primary">Ir al título</button>
            <button type="button" className="multimedia-secondary">Mi lista</button>
          </div> */}

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
      </div>

      <section className={`multimedia-rail ${isContinueFocused ? 'is-focused' : ''}`}>
        <div className="multimedia-rail-heading">
          <h2>Continuar viendo</h2>
          <span>Próximamente</span>
        </div>
        <div className="multimedia-cards">
          {continueWatching.map((item, index) => (
            <article
              className={`multimedia-card card-${(index % 5) + 1} ${isContinueFocused && index === continueWatchingIndex ? 'is-focused' : ''}`}
              key={item.id}
            >
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