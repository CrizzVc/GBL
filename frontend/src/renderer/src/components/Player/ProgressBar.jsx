import React, { useState, useRef, useEffect } from 'react';

const ProgressBar = ({ progress, duration, buffered, onSeek }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [hoverPos, setHoverPos] = useState(0);
    const barRef = useRef(null);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = (e) => {
        if (!barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        setHoverPos(Math.max(0, Math.min(1, pos)));
    };

    const handleClick = (e) => {
        if (!barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        onSeek(pos * duration);
    };

    return (
        <div 
            className="group relative w-full h-4 flex items-center cursor-pointer mb-2"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            ref={barRef}
        >
            {/* Background Bar */}
            <div className="absolute w-full h-1 bg-white/20 rounded-full transition-all duration-200 group-hover:h-2" />
            
            {/* Buffered Bar */}
            <div 
                className="absolute h-1 bg-white/30 rounded-full transition-all duration-200 group-hover:h-2"
                style={{ width: `${(buffered / duration) * 100}%` }}
            />
            
            {/* Progress Bar */}
            <div 
                className="absolute h-1 bg-anime-primary rounded-full transition-all duration-200 group-hover:h-2 shadow-[0_0_10px_rgba(255,138,0,0.5)]"
                style={{ width: `${(progress / duration) * 100}%` }}
            />

            {/* Hover Indicator */}
            {isHovering && (
                <div 
                    className="absolute h-1 bg-white/40 rounded-full group-hover:h-2"
                    style={{ width: `${hoverPos * 100}%` }}
                />
            )}

            {/* Hover Time Preview */}
            {isHovering && (
                <div 
                    className="absolute bottom-8 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded border border-white/10 backdrop-blur-sm pointer-events-none"
                    style={{ left: `${hoverPos * 100}%` }}
                >
                    {formatTime(hoverPos * duration)}
                </div>
            )}

            {/* Handle */}
            <div 
                className="absolute h-3 w-3 bg-white rounded-full border-2 border-anime-primary shadow-lg scale-0 transition-transform duration-200 group-hover:scale-100"
                style={{ left: `calc(${(progress / duration) * 100}% - 6px)` }}
            />
        </div>
    );
};

export default ProgressBar;
