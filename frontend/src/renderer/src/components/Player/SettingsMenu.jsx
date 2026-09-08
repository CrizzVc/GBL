import React, { useState } from 'react';
import { Settings, Check, ChevronRight } from 'lucide-react';

const SettingsMenu = ({ qualities, currentQuality, onQualityChange, subtitles, currentSubtitle, onSubtitleChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('main'); // 'main', 'quality', 'subtitles'

    const handleOpen = () => {
        setIsOpen(!isOpen);
        setView('main');
    };

    return (
        <div className="relative">
            <button 
                onClick={handleOpen}
                className={`text-white/80 hover:text-white transition-all duration-300 ${isOpen ? 'rotate-90 text-anime-primary' : ''}`}
            >
                <Settings size={22} />
            </button>

            {isOpen && (
                <div className="absolute bottom-12 right-0 w-64 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl animate-fade-in z-50">
                    {view === 'main' && (
                        <div className="p-2">
                            <button 
                                onClick={() => setView('quality')}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-md transition-colors"
                            >
                                <span className="text-sm">Calidad</span>
                                <div className="flex items-center text-white/50 text-xs">
                                    <span>{currentQuality === -1 ? 'Auto' : qualities[currentQuality]?.height + 'p'}</span>
                                    <ChevronRight size={16} />
                                </div>
                            </button>
                            <button 
                                onClick={() => setView('subtitles')}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-md transition-colors"
                            >
                                <span className="text-sm">Subtítulos</span>
                                <div className="flex items-center text-white/50 text-xs">
                                    <span>{currentSubtitle === -1 ? 'Desactivado' : subtitles[currentSubtitle]?.label}</span>
                                    <ChevronRight size={16} />
                                </div>
                            </button>
                        </div>
                    )}

                    {view === 'quality' && (
                        <div>
                            <div className="p-3 border-b border-white/10 flex items-center">
                                <button onClick={() => setView('main')} className="mr-2 hover:text-anime-primary">
                                    <ChevronRight size={18} className="rotate-180" />
                                </button>
                                <span className="text-sm font-medium">Seleccionar Calidad</span>
                            </div>
                            <div className="p-1 max-h-64 overflow-y-auto">
                                <button 
                                    onClick={() => { onQualityChange(-1); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-md transition-colors"
                                >
                                    <span className="text-sm">Automático</span>
                                    {currentQuality === -1 && <Check size={16} className="text-anime-primary" />}
                                </button>
                                {qualities.map((q, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => { onQualityChange(idx); setIsOpen(false); }}
                                        className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        <span className="text-sm">{q.height}p</span>
                                        {currentQuality === idx && <Check size={16} className="text-anime-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'subtitles' && (
                        <div>
                            <div className="p-3 border-b border-white/10 flex items-center">
                                <button onClick={() => setView('main')} className="mr-2 hover:text-anime-primary">
                                    <ChevronRight size={18} className="rotate-180" />
                                </button>
                                <span className="text-sm font-medium">Subtítulos</span>
                            </div>
                            <div className="p-1 max-h-64 overflow-y-auto">
                                <button 
                                    onClick={() => { onSubtitleChange(-1); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-md transition-colors"
                                >
                                    <span className="text-sm">Desactivado</span>
                                    {currentSubtitle === -1 && <Check size={16} className="text-anime-primary" />}
                                </button>
                                {subtitles.map((s, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => { onSubtitleChange(idx); setIsOpen(false); }}
                                        className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        <span className="text-sm">{s.label}</span>
                                        {currentSubtitle === idx && <Check size={16} className="text-anime-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsMenu;
