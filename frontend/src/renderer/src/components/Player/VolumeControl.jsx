import React, { useState } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

const VolumeControl = ({ volume, isMuted, onVolumeChange, onToggleMute }) => {
    const [isHovered, setIsHovered] = useState(false);

    const getIcon = () => {
        if (isMuted || volume === 0) return <VolumeX size={20} />;
        if (volume < 0.5) return <Volume1 size={20} />;
        return <Volume2 size={20} />;
    };

    return (
        <div 
            className="relative flex items-center h-full px-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button 
                onClick={onToggleMute}
                className="text-white/80 hover:text-white transition-colors"
            >
                {getIcon()}
            </button>

            <div className={`
                flex items-center transition-all duration-300 origin-left overflow-hidden
                ${isHovered ? 'w-24 ml-3' : 'w-0 ml-0'}
            `}>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-anime-primary hover:bg-white/30 transition-colors"
                />
            </div>
        </div>
    );
};

export default VolumeControl;
