import React from 'react';

export interface MediaItem {
  id: number;
  title: string;
  episode: string;
  posterImage?: string | null;
  episodeImage?: string | null;
  animeUrl?: string | null;
}

interface MediaDetailViewProps {
  item: MediaItem;
  onClose: () => void;
}

const MediaDetailView: React.FC<MediaDetailViewProps> = ({ item, onClose }) => {
  const [backdrop, setBackdrop] = React.useState<string | null>(null);
  const [episodes, setEpisodes] = React.useState<Array<{ episode: string; episodeUrl: string; image?: string | null }>>([]);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetch(`http://localhost:3000/api/tmdb/backdrop?query=${encodeURIComponent(item.title)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { backdrop?: string | null } | null) => setBackdrop(data?.backdrop || null))
      .catch(() => undefined);
    if (item.animeUrl) {
      void fetch(`http://localhost:3000/api/animeav1/episodes?url=${encodeURIComponent(item.animeUrl)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((data: { data?: Array<{ episode: string; episodeUrl: string; image?: string | null }> } | null) => setEpisodes(data?.data || []))
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, [item.animeUrl, item.title]);

  const backgroundImage = backdrop || item.episodeImage || item.posterImage || '';

  return (
    <main className="media-detail-view" aria-label={`Detalle de ${item.title}`}>
      <div className="media-detail-background" style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined} />
      <button type="button" className="media-detail-back" onClick={onClose}>‹ Volver</button>
      <button type="button" className="media-detail-close" onClick={onClose} aria-label="Cerrar">×</button>
      <section className="media-detail-hero">
        {item.posterImage && <img src={item.posterImage} alt={item.title} className="media-detail-poster" />}
        <div>
          <h1>{item.title}</h1>
          <span>Episodio {item.episode}</span>
        </div>
      </section>
      <section className="media-detail-episodes">
        <h2>Episodios</h2>
        <div className="media-detail-episodes-row">
          {episodes.length === 0 && <p>Cargando episodios…</p>}
          {episodes.map((episode) => (
            <article className={episode.episode === item.episode ? 'is-current' : ''} key={episode.episode}>
              <div style={(episode.image || item.episodeImage || item.posterImage) ? {
                backgroundImage: `url("${episode.image || item.episodeImage || item.posterImage}")`
              } : undefined} />
              <span>Episodio {episode.episode}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default MediaDetailView;
