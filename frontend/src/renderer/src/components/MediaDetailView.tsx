import React from 'react';
import VideoPlayer from './Player/VideoPlayer';

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
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = React.useState(0);
  const [playerEpisode, setPlayerEpisode] = React.useState<{ url: string; episode: string } | null>(null);
  const [pendingEpisode, setPendingEpisode] = React.useState<{ episode: string; episodeUrl: string } | null>(null);
  const [servers, setServers] = React.useState<Array<{ name: string; url: string }>>([]);
  const [focusedServerIndex, setFocusedServerIndex] = React.useState(0);
  const [isLoadingServers, setIsLoadingServers] = React.useState(false);
  const episodeRefs = React.useRef<Array<HTMLElement | null>>([]);

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

  const openServerSelector = React.useCallback(async (episode?: { episode: string; episodeUrl: string }): Promise<void> => {
    if (!episode) return;
    setPendingEpisode(episode);
    setFocusedServerIndex(0);
    setServers([]);
    setIsLoadingServers(true);
    try {
      const response = await fetch(`http://localhost:3000/api/animeav1/servers?url=${encodeURIComponent(episode.episodeUrl)}`);
      const data = await response.json() as { data?: Array<{ name: string; url: string }> };
      setServers(data.data || []);
    } catch (error) {
      console.error('No se pudieron cargar los servidores:', error);
    } finally {
      setIsLoadingServers(false);
    }
  }, []);

  const startPlayer = React.useCallback((server?: { url: string }): void => {
    if (!server || !pendingEpisode) return;
    setPlayerEpisode({ url: server.url, episode: pendingEpisode.episode });
    setPendingEpisode(null);
  }, [pendingEpisode]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (playerEpisode) return;
      if (pendingEpisode) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setFocusedServerIndex((index) => Math.min(index + 1, servers.length - 1)); }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setFocusedServerIndex((index) => Math.max(index - 1, 0)); }
        if (event.key === 'Enter') { event.preventDefault(); startPlayer(servers[focusedServerIndex]); }
        if (event.key === 'Escape') { event.preventDefault(); setPendingEpisode(null); }
        return;
      }
      if (episodes.length === 0) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); setFocusedEpisodeIndex((index) => Math.min(index + 1, episodes.length - 1)); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); setFocusedEpisodeIndex((index) => Math.max(index - 1, 0)); }
      if (event.key === 'Enter') { event.preventDefault(); void openServerSelector(episodes[focusedEpisodeIndex]); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [episodes, focusedEpisodeIndex, playerEpisode, pendingEpisode, servers, focusedServerIndex, openServerSelector, startPlayer]);

  React.useEffect(() => {
    episodeRefs.current[focusedEpisodeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [focusedEpisodeIndex]);

  return (
    <main className="media-detail-view" aria-label={`Detalle de ${item.title}`}>
      {pendingEpisode && (
        <div className="media-server-modal-backdrop" onClick={() => setPendingEpisode(null)}>
          <section className="media-server-modal" onClick={(event) => event.stopPropagation()} aria-label="Elegir reproductor">
            <p>EPISODIO {pendingEpisode.episode}</p>
            <h2>Elige un reproductor</h2>
            {isLoadingServers && <span>Buscando opciones…</span>}
            {!isLoadingServers && servers.length === 0 && <span>No hay servidores disponibles.</span>}
            <div className="media-server-options">
              {servers.map((server, index) => (
                <button
                  type="button"
                  key={`${server.name}-${server.url}`}
                  className={index === focusedServerIndex ? 'is-focused' : ''}
                  onClick={() => startPlayer(server)}
                >
                  <span>▶</span> {server.name}
                </button>
              ))}
            </div>
            <button type="button" className="media-server-cancel" onClick={() => setPendingEpisode(null)}>Cancelar</button>
          </section>
        </div>
      )}
      {playerEpisode && (
        <div className="media-detail-player">
          <VideoPlayer
            src={playerEpisode.url}
            title={`${item.title} · Episodio ${playerEpisode.episode}`}
            isDirect={false}
            episodes={episodes}
            currentEpisodeIndex={episodes.findIndex((episode) => episode.episode === playerEpisode.episode)}
            onPlayEpisodeIndex={(index: number) => void openServerSelector(episodes[index])}
            onBack={() => setPlayerEpisode(null)}
          />
        </div>
      )}
      <div className="media-detail-background" style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined} />
      <button type="button" className="media-detail-back" onClick={onClose}>‹ Volver</button>
      <button type="button" className="media-detail-close" onClick={onClose} aria-label="Cerrar">×</button>
      <section className="media-detail-hero">
        {item.posterImage && <img src={item.posterImage} alt={item.title} className="media-detail-poster" />}
        <div className="media-detail-title">
          <h1>{item.title}</h1>
          <span>Episodio {item.episode}</span>
        </div>
      </section>
      <section className="media-detail-episodes">
        <h2>Episodios</h2>
        <div className="media-detail-episodes-row">
          {episodes.length === 0 && <p>Cargando episodios…</p>}
          {episodes.map((episode, index) => (
            <article
              className={`${episode.episode === item.episode ? 'is-current' : ''} ${index === focusedEpisodeIndex ? 'is-focused' : ''}`}
              key={episode.episode}
              ref={(element) => { episodeRefs.current[index] = element }}
              onClick={() => void openServerSelector(episode)}
            >
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
