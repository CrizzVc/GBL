import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import VideoControls from './VideoControls';

const VideoPlayer = ({
    src,
    title,
    subtitles: externalSubtitles = [],
    nextEpisode,
    onBack,
    onEnded,
    isDirect,
    episodes = [],
    currentEpisodeIndex = -1,
    onPlayEpisodeIndex,
    episodeSortOrder = 'desc',
    animeUrl = '',
    isEpisodeWatched = () => false,
    markEpisodeWatched = () => {}
}) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const containerRef = useRef(null);
    const hideTimeoutRef = useRef(null);
    const isTouchDevice = useRef('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const isDirectVideo = isDirect !== undefined ? isDirect : (src && (src.includes('.m3u8') || src.includes('.mp4')));

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(() => {
        return parseFloat(localStorage.getItem('player-volume')) || 0.7;
    });
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState(-1);
    const [subtitles, setSubtitles] = useState([]);
    const [currentSubtitle, setCurrentSubtitle] = useState(-1);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isEpisodeListOpen, setIsEpisodeListOpen] = useState(false);
    const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState(-1);
    const episodeRefs = useRef({});
    const [iframeSrc, setIframeSrc] = useState(src);
    const [iframeKey, setIframeKey] = useState(0);
    const wasPlayingRef = useRef(false);

    // Initial focus when opening episode list
    useEffect(() => {
        if (isEpisodeListOpen) {
            setFocusedEpisodeIndex(currentEpisodeIndex >= 0 ? currentEpisodeIndex : 0);
        }
    }, [isEpisodeListOpen, currentEpisodeIndex]);

    // Scroll and focus on the selected episode
    useEffect(() => {
        if (isEpisodeListOpen && focusedEpisodeIndex >= 0 && episodeRefs.current[focusedEpisodeIndex]) {
            episodeRefs.current[focusedEpisodeIndex].focus();
            episodeRefs.current[focusedEpisodeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [focusedEpisodeIndex, isEpisodeListOpen]);

    // Pause/Resume video on opening/closing episode list
    useEffect(() => {
        if (!isDirectVideo) return;
        const video = videoRef.current;
        if (!video) return;

        if (isEpisodeListOpen) {
            wasPlayingRef.current = !video.paused;
            if (!video.paused) {
                video.pause();
            }
        } else {
            if (wasPlayingRef.current) {
                video.play().catch(e => console.log("Play failed on resume:", e));
            }
        }
    }, [isEpisodeListOpen, isDirectVideo]);

    // Sync external subtitles
    useEffect(() => {
        setSubtitles(externalSubtitles);
        if (externalSubtitles.length > 0) {
            setCurrentSubtitle(0); // Select first subtitle by default if available
        } else {
            setCurrentSubtitle(-1);
        }
    }, [externalSubtitles]);

    // Sync iframeSrc when src changes
    useEffect(() => {
        setIframeSrc(src);
    }, [src]);

    // Initialize HLS or native player
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const isMp4 = src && src.includes('.mp4');

        if (isMp4) {
            video.src = src;
            // Resume from saved progress if available
            const savedProgress = localStorage.getItem(`progress-${src}`);
            if (savedProgress) {
                video.currentTime = parseFloat(savedProgress);
            }
            video.play().catch(e => console.log("Autoplay blocked", e));
        } else if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels = hls.levels.map(l => ({
                    height: l.height,
                    bitrate: l.bitrate
                }));
                setQualities(levels);

                // Resume from saved progress if available
                const savedProgress = localStorage.getItem(`progress-${src}`);
                if (savedProgress) {
                    video.currentTime = parseFloat(savedProgress);
                }

                video.play().catch(e => console.log("Autoplay blocked", e));
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
                if (currentQuality === -1) {
                    // Auto quality switch update if needed
                }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log("HLS Network Error, trying to recover...");
                            // If it's a manifest load error (CORS or not HLS), fallback might be better than infinite loop
                            if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                                console.log("Manifest load failed (possibly CORS or MP4 without extension). Falling back to native.");
                                hls.destroy();
                                video.src = src;
                                video.play().catch(e => console.log("Autoplay blocked on fallback", e));
                            } else {
                                hls.startLoad();
                            }
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log("HLS Media Error, trying to recover...");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.log("HLS Error unrecoverable, falling back to native playback...");
                            hls.destroy();
                            // Fallback a reproductor nativo
                            video.src = src;
                            video.play().catch(e => console.log("Autoplay blocked on fallback", e));
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [src]);

    // Handle Time Updates and Buffering
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => {
            setProgress(video.currentTime);
            // Save progress every 5 seconds to local storage
            if (Math.floor(video.currentTime) % 5 === 0) {
                localStorage.setItem(`progress-${src}`, video.currentTime.toString());
            }
        };

        const onDurationChange = () => setDuration(video.duration);

        const onProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => setIsBuffering(false);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('progress', onProgress);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('progress', onProgress);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
        };
    }, [src]);

    // Volume handling
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent scrolling
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (!(e.key === ' ' && isEpisodeListOpen)) {
                    e.preventDefault();
                }
            }

            if (isEpisodeListOpen) {
                switch (e.key.toLowerCase()) {
                    case 'arrowleft':
                        e.preventDefault();
                        setFocusedEpisodeIndex(prev => Math.max(0, prev - 1));
                        break;
                    case 'arrowright':
                        e.preventDefault();
                        setFocusedEpisodeIndex(prev => Math.min((episodes?.length || 1) - 1, prev + 1));
                        break;
                    case 'enter':
                        e.preventDefault();
                        if (focusedEpisodeIndex >= 0 && focusedEpisodeIndex < (episodes?.length || 0)) {
                            if (onPlayEpisodeIndex) onPlayEpisodeIndex(focusedEpisodeIndex);
                            setIsEpisodeListOpen(false);
                        }
                        break;
                    case 'escape':
                        e.preventDefault();
                        setIsEpisodeListOpen(false);
                        break;
                }
                return;
            }

            switch (e.key.toLowerCase()) {
                case ' ':
                    togglePlay();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'arrowleft':
                    skip(-10);
                    break;
                case 'arrowright':
                    skip(10);
                    break;
                case 'arrowup':
                    setVolume(v => Math.min(1, v + 0.1));
                    break;
                case 'arrowdown':
                    setVolume(v => Math.max(0, v - 0.1));
                    break;
                case 'm':
                    setIsMuted(prev => !prev);
                    break;
                case 'escape':
                    if (isFullscreen) toggleFullscreen();
                    break;
                default:
                    break;
            }
            showControls();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, isEpisodeListOpen, focusedEpisodeIndex, episodes, onPlayEpisodeIndex]);


    // Mouse/Touch movement to show/hide controls
    const showControls = useCallback(() => {
        setIsControlsVisible(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

        // On touch devices, always auto-hide after 3s (regardless of play state)
        // On desktop, hide only if playing or if it's an iframe
        // Do not auto-hide if episode list is open
        if (!isEpisodeListOpen && (isTouchDevice.current || isPlaying || !isDirectVideo)) {
            hideTimeoutRef.current = setTimeout(() => {
                setIsControlsVisible(false);
            }, 3000);
        }
    }, [isPlaying, isDirectVideo, isEpisodeListOpen]);

    // Toggle controls on touch tap (show if hidden, hide if visible)
    const handleTouchTap = useCallback(() => {
        setIsControlsVisible(prev => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            if (!prev) {
                // Showing controls — start auto-hide timer
                hideTimeoutRef.current = setTimeout(() => {
                    setIsControlsVisible(false);
                }, 3000);
                return true;
            } else {
                // Already visible — hide immediately
                return false;
            }
        });
    }, []);

    // Auto-hide controls on initial load
    useEffect(() => {
        showControls();
        return () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [src, showControls]);

    // Fullscreen handling
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play().catch(e => console.log("Play failed:", e));
        } else {
            videoRef.current.pause();
        }
    };

    const seek = (time) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = time;
        setProgress(time);
    };

    const skip = (seconds) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime += seconds;
    };

    const handleVolumeChange = (newVolume) => {
        setVolume(newVolume);
        localStorage.setItem('player-volume', newVolume.toString());
        if (newVolume > 0) setIsMuted(false);
    };

    const handleQualityChange = (index) => {
        setCurrentQuality(index);
        if (hlsRef.current) {
            hlsRef.current.currentLevel = index;
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group"
            onMouseMove={isTouchDevice.current ? undefined : showControls}
            onMouseEnter={isTouchDevice.current ? undefined : showControls}
            onClick={isTouchDevice.current ? handleTouchTap : showControls}
            onTouchStart={isTouchDevice.current ? undefined : showControls}
            onMouseLeave={() => !isTouchDevice.current && isPlaying && setIsControlsVisible(false)}
        >
            {/* Background darkening overlay when episode list is open */}
            {isEpisodeListOpen && (
                <div className="absolute inset-0 bg-black/70 z-40 transition-opacity duration-300 pointer-events-none" />
            )}

            {isDirectVideo ? (
                <>
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        playsInline
                        onEnded={onEnded}
                    />

                    {/* Buffering Indicator */}
                    {isBuffering && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                            <div className="w-16 h-16 border-4 border-anime-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,138,0,0.4)]"></div>
                        </div>
                    )}

                    {/* Controls Layer */}
                    <VideoControls
                        isPlaying={isPlaying}
                        progress={progress}
                        duration={duration}
                        buffered={buffered}
                        volume={volume}
                        isMuted={isMuted}
                        isFullscreen={isFullscreen}
                        isVisible={isControlsVisible}
                        title={title}
                        qualities={qualities}
                        currentQuality={currentQuality}
                        subtitles={subtitles}
                        currentSubtitle={currentSubtitle}
                        onTogglePlay={togglePlay}
                        onSeek={seek}
                        onSkip={skip}
                        onVolumeChange={handleVolumeChange}
                        onToggleMute={() => setIsMuted(!isMuted)}
                        onToggleFullscreen={toggleFullscreen}
                        onQualityChange={handleQualityChange}
                        onSubtitleChange={setCurrentSubtitle}
                        onBack={onBack}
                        onNextEpisode={nextEpisode}
                        isEpisodeListOpen={isEpisodeListOpen}
                        onToggleEpisodeList={() => setIsEpisodeListOpen(prev => !prev)}
                        hasEpisodes={episodes && episodes.length > 0}
                    />

                    {/* Saltar Intro Floating Button */}
                    {isControlsVisible && !isEpisodeListOpen && isDirectVideo && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                skip(88);
                            }}
                            className="absolute bottom-28 right-8 z-50 flex items-center gap-2 px-5 py-2.5 bg-black/85 hover:bg-white hover:text-black border border-white/10 rounded-lg backdrop-blur-md transition-all duration-300 font-semibold shadow-lg hover:scale-105 active:scale-95 text-white text-sm"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                                <line x1="19" y1="5" x2="19" y2="19"></line>
                            </svg>
                            <span>Saltar Intro</span>
                        </button>
                    )}

                    {/* Horizontal Episode List bottom overlay */}
                    {isEpisodeListOpen && isControlsVisible && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-28 left-0 right-0 z-50 p-4 transition-all duration-300 flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between px-2">
                                <span className="text-white font-medium text-sm tracking-wider uppercase opacity-80 drop-shadow-md">Lista de Capítulos</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEpisodeListOpen(false);
                                    }}
                                    className="text-white/60 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                            <div className="flex overflow-x-auto gap-3 pb-2 pt-1 px-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {[...(episodes || [])]
                                    .sort((a, b) => {
                                        const numA = parseFloat(a.episode);
                                        const numB = parseFloat(b.episode);
                                        return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                                    })
                                    .map((ep, idx) => {
                                        const origIdx = (episodes || []).indexOf(ep);
                                        const isActive = idx === focusedEpisodeIndex;
                                        const isCurrent = idx === currentEpisodeIndex;
                                        const epThumb = ep.image;
                                        return (
                                            <button
                                                key={idx}
                                                ref={(el) => episodeRefs.current[idx] = el}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onPlayEpisodeIndex) {
                                                        onPlayEpisodeIndex(origIdx);
                                                    }
                                                    setIsEpisodeListOpen(false);
                                                }}
                                                className={`flex-shrink-0 w-36 aspect-video rounded-md overflow-hidden relative border transition-all duration-200 hover:scale-105 active:scale-95 outline-none ${isActive ? 'border-[#ff8a00] scale-105' :
                                                        isCurrent ? 'border-[#ff8a00]/50' : 'border-white/10 hover:border-white/40'
                                                    }`}
                                            >
                                                {epThumb ? (
                                                    <img
                                                        src={epThumb}
                                                        className="w-full h-full object-cover"
                                                        alt={`Episodio ${ep.episode}`}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-xs text-white/40">
                                                        Episodio {ep.episode}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-1.5 justify-center">
                                                    <span className={`text-[11px] font-bold ${isCurrent ? 'text-[#ff8a00]' : 'text-white'}`}>
                                                        Episodio {ep.episode}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <iframe
                        key={iframeKey}
                        src={iframeSrc}
                        className="w-full h-full border-none"
                        allowFullScreen
                        allow="autoplay; fullscreen"
                    ></iframe>

                    {/* Simplified Top Bar for iFrames */}
                    <div className={`
                        absolute inset-x-0 top-0 z-40 flex flex-col justify-between transition-opacity duration-500 pointer-events-none
                        ${isControlsVisible ? 'opacity-100' : 'opacity-0'}
                    `}>
                        <div className="h-32 bg-gradient-to-b from-black/80 to-transparent p-6 flex items-start justify-between pointer-events-auto">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={onBack}
                                    className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                                >
                                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12"></line>
                                        <polyline points="12 19 5 12 12 5"></polyline>
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-white text-xl font-medium drop-shadow-md">{title || 'Reproduciendo...'}</h1>
                                    <p className="text-white/60 text-sm">Servidor Externo</p>
                                </div>
                            </div>
                            {episodes && episodes.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEpisodeListOpen(prev => !prev);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm pointer-events-auto ${isEpisodeListOpen
                                            ? 'bg-[#ff8a00] text-white shadow-[0_0_10px_rgba(255,138,0,0.4)]'
                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                        }`}
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="8" y1="6" x2="21" y2="6"></line>
                                        <line x1="8" y1="12" x2="21" y2="12"></line>
                                        <line x1="8" y1="18" x2="21" y2="18"></line>
                                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                    </svg>
                                    <span>Capítulos</span>
                                </button>
                            )}
                        </div>
                    </div>



                    {/* Horizontal Episode List bottom overlay for IFrames */}
                    {isEpisodeListOpen && isControlsVisible && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-12 left-0 right-0 z-50 p-4 transition-all duration-300 flex flex-col gap-2 pointer-events-auto"
                        >
                            <div className="flex items-center justify-between px-2">
                                <span className="text-white font-medium text-sm tracking-wider uppercase opacity-80 drop-shadow-md">Lista de Capítulos</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEpisodeListOpen(false);
                                    }}
                                    className="text-white/60 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                            <div className="flex overflow-x-auto gap-3 pb-2 pt-1 px-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {[...(episodes || [])]
                                    .sort((a, b) => {
                                        const numA = parseFloat(a.episode);
                                        const numB = parseFloat(b.episode);
                                        return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                                    })
                                    .map((ep, idx) => {
                                        const origIdx = (episodes || []).indexOf(ep);
                                        const isActive = idx === focusedEpisodeIndex;
                                        const isCurrent = idx === currentEpisodeIndex;
                                        const epThumb = ep.image;
                                        const watched = isEpisodeWatched(animeUrl, ep.episode);
                                        return (
                                            <button
                                                key={idx}
                                                ref={(el) => episodeRefs.current[idx] = el}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onPlayEpisodeIndex) {
                                                        onPlayEpisodeIndex(origIdx);
                                                    }
                                                    setIsEpisodeListOpen(false);
                                                }}
                                                className={`flex-shrink-0 w-36 aspect-video rounded-md overflow-hidden relative border transition-all duration-200 hover:scale-105 active:scale-95 outline-none ${isActive ? 'border-[#ff8a00] scale-105' :
                                                        isCurrent ? 'border-[#ff8a00]/50' : 'border-white/10 hover:border-white/40'
                                                    }`}
                                            >
                                                {epThumb ? (
                                                    <img
                                                        src={epThumb}
                                                        className="w-full h-full object-cover"
                                                        alt={`Episodio ${ep.episode}`}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-xs text-white/40">
                                                        Episodio {ep.episode}
                                                    </div>
                                                )}
                                                {watched && (
                                                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center z-10 border border-white/20 shadow-md">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-1.5 justify-center">
                                                    <span className={`text-[11px] font-bold ${isCurrent ? 'text-[#ff8a00]' : 'text-white'}`}>
                                                        Episodio {ep.episode}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default VideoPlayer;
