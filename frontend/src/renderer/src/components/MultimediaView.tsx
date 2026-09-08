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
  continueWatching: { id: number; title: string; season: string; episode: string; progress: number; image?: string | null }[];
  setNativeView: (view: 'multimedia' | null) => void;
  isHeroPaused: boolean;
  setIsHeroPaused: (p: boolean) => void;
  profileAvatar: string;
  profileName: string;
  onProfileClick: () => void;
  focusedSection: 'hero' | 'continue';
  continueWatchingIndex: number;
  railTitle?: string;
  railSubtitle?: string;
  activeSourceId: string;
  sources: { id: string; name: string }[];
  onSourceChange: (sourceId: string) => void;
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
  railTitle = 'Continuar viendo',
  railSubtitle = 'Próximamente',
  activeSourceId,
  sources,
  onSourceChange,
}) => {
  const isContinueFocused = focusedSection === 'continue';
  const focusedCardRef = React.useRef<HTMLElement | null>(null);
  const [focusedCardOffset, setFocusedCardOffset] = React.useState(0);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = React.useState(false);
  const activeSource = sources.find((source) => source.id === activeSourceId) || sources[0];

  React.useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const card = focusedCardRef.current;
      if (card) setFocusedCardOffset(Math.max(0, card.offsetLeft - 14));
    });

    return () => cancelAnimationFrame(frame);
  }, [continueWatchingIndex]);

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
          <h2>{railTitle}</h2>
          <span>{railSubtitle}</span>
        </div>
        <div className="multimedia-source-picker">
          <button
            type="button"
            className="multimedia-source-button"
            onClick={() => setIsSourcePickerOpen((open) => !open)}
            aria-label={`Fuente actual: ${activeSource?.name || 'Multimedia'}`}
            aria-expanded={isSourcePickerOpen}
          >
            {(activeSource?.name || 'M').slice(0, 3).toUpperCase()}
          </button>
          {isSourcePickerOpen && (
            <div className="multimedia-source-menu">
              {sources.map((source) => (
                <button
                  type="button"
                  key={source.id}
                  className={source.id === activeSourceId ? 'is-active' : ''}
                  onClick={() => { onSourceChange(source.id); setIsSourcePickerOpen(false) }}
                >
                  {source.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="multimedia-cards">
          <div
            className="multimedia-cards-track"
            style={{ transform: `translateX(-${focusedCardOffset}px)` }}
          >
            {continueWatching.map((item, index) => (
            <article
              className={`multimedia-card card-${(index % 5) + 1} ${index === continueWatchingIndex ? 'is-selected' : ''} ${isContinueFocused && index === continueWatchingIndex ? 'is-focused' : ''}`}
              key={item.id}
              ref={index === continueWatchingIndex ? focusedCardRef : null}
            >
              <div
                className="multimedia-card-thumb"
                style={item.image ? { backgroundImage: `url("${item.image}")` } : undefined}
              >
                <div className="multimedia-card-progress">
                  <i style={{ width: `${item.progress}%` }} />
                </div>
              </div>
              <div className="multimedia-card-info">
                <p className="multimedia-card-title">{item.title}</p>
                <div className="multimedia-card-meta">
                  <span>Temp. {item.season}</span>
                  <span>Ep. {item.episode}</span>
                </div>
              </div>
            </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default MultimediaView;
