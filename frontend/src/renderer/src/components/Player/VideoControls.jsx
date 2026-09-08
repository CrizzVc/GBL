import React from 'react';
import { Play, Pause, RotateCcw, RotateCw, Maximize, Minimize, SkipForward, ArrowLeft, List } from 'lucide-react';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import SettingsMenu from './SettingsMenu';

const VideoControls = ({ 
    isPlaying, 
    progress, 
    duration, 
    buffered,
    volume,
    isMuted,
    isFullscreen,
    isVisible,
    title,
    qualities,
    currentQuality,
    subtitles,
    currentSubtitle,
    onTogglePlay,
    onSeek,
    onSkip,
    onVolumeChange,
    onToggleMute,
    onToggleFullscreen,
    onQualityChange,
    onSubtitleChange,
    onBack,
    onNextEpisode,
    isEpisodeListOpen,
    onToggleEpisodeList,
    hasEpisodes
}) => {

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`
            absolute inset-0 z-40 flex flex-col justify-between transition-opacity duration-500
            ${isVisible ? 'opacity-100 cursor-default' : 'opacity-0 cursor-none'}
        `}>
            {/* Top Bar - Gradient Overlay */}
            <div className="h-32 bg-gradient-to-b from-black/80 to-transparent p-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                    >
                        <ArrowLeft size={28} />
                    </button>
                    <div>
                        <h1 className="text-white text-xl font-medium drop-shadow-md">{title || 'Reproduciendo...'}</h1>
                        <p className="text-white/60 text-sm">Streaming HLS Adaptativo</p>
                    </div>
                </div>
            </div>

            {/* Middle - Play/Pause Center Indicator (Optional, but let's stick to bottom controls for now) */}

            {/* Bottom Bar - Controls */}
            <div className="h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 pb-6 flex flex-col justify-end">
                
                {/* Progress Bar Container */}
                <ProgressBar 
                    progress={progress} 
                    duration={duration} 
                    buffered={buffered}
                    onSeek={onSeek}
                />

                <div className="flex items-center justify-between">
                    {/* Left Controls */}
                    <div className="flex items-center gap-4">
                        <button onClick={onTogglePlay} className="text-white/90 hover:text-white hover:scale-110 transition-all p-2">
                            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                        </button>
                        
                        <div className="flex items-center gap-2 ml-2">
                            <button onClick={() => onSkip(-10)} className="text-white/80 hover:text-white transition-colors">
                                <RotateCcw size={24} />
                            </button>
                            <button onClick={() => onSkip(10)} className="text-white/80 hover:text-white transition-colors">
                                <RotateCw size={24} />
                            </button>
                        </div>

                        <VolumeControl 
                            volume={volume}
                            isMuted={isMuted}
                            onVolumeChange={onVolumeChange}
                            onToggleMute={onToggleMute}
                        />

                        <div className="text-white/90 text-sm font-mono ml-2 select-none">
                            <span>{formatTime(progress)}</span>
                            <span className="mx-1 text-white/30">/</span>
                            <span className="text-white/50">{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-4">
                        {hasEpisodes && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleEpisodeList();
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm ${
                                    isEpisodeListOpen 
                                        ? 'bg-[#ff8a00] text-white shadow-[0_0_10px_rgba(255,138,0,0.4)]' 
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                            >
                                <List size={18} />
                                <span>Capítulos</span>
                            </button>
                        )}

                        {onNextEpisode && (
                            <button 
                                onClick={onNextEpisode}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all text-sm"
                            >
                                <SkipForward size={18} />
                                <span>Siguiente</span>
                            </button>
                        )}
                        
                        <SettingsMenu 
                            qualities={qualities}
                            currentQuality={currentQuality}
                            onQualityChange={onQualityChange}
                            subtitles={subtitles}
                            currentSubtitle={currentSubtitle}
                            onSubtitleChange={onSubtitleChange}
                        />

                        <button onClick={onToggleFullscreen} className="text-white/80 hover:text-white transition-all p-2">
                            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoControls;
