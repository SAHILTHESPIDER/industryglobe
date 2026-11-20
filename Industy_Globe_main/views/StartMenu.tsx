import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Star, User, Calendar, Award } from 'lucide-react';
import { Player } from '../types';
import { APP_DISPLAY_VERSION } from '../services/appVersion';
import { IndustryGlobeMark } from '../components/IndustryGlobeMark';

interface StartMenuProps {
  saveSlots: Record<number, Player | null>;
  onSelectSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({ saveSlots, onSelectSlot, onDeleteSlot }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [view, setView] = useState<'MAIN' | 'SLOTS'>('MAIN');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    // Intro Sequence Timing
    const timer1 = setTimeout(() => {
        setShowSplash(false);
    }, 2500); // Splash visible for 2.5s

    const timer2 = setTimeout(() => {
        setShowMenu(true);
    }, 2800); // Menu appears shortly after

    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const renderSlot = (slot: number) => {
    const save = saveSlots[slot];
    const isDeleting = confirmDelete === slot;

    return (
        <div key={slot} className="relative group">
            <button
                onClick={() => !isDeleting && onSelectSlot(slot)}
                className={`w-full min-h-[200px] lg:min-h-[320px] rounded-2xl relative overflow-hidden transition-all duration-500 border flex flex-col justify-between p-5 text-left ${
                    save
                    ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-amber-500/30 hover:border-amber-400/80 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(245,158,11,0.35)]'
                    : 'bg-zinc-950/60 border-zinc-800 border-dashed hover:border-zinc-600 hover:bg-zinc-900/60 hover:-translate-y-1'
                }`}
            >
                {/* Poster top: spotlight + grain */}
                {save && (
                    <>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.25),_transparent_60%)] pointer-events-none" />
                        <div className="absolute inset-0 film-grain opacity-[0.07] pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                    </>
                )}

                {/* Slot header */}
                <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 border border-zinc-700/70 px-2 py-1 rounded-sm bg-black/40">
                        Slot {slot}
                    </span>
                    {save && (
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 flex items-center gap-1">
                            <Star size={10} className="fill-amber-400" /> Active
                        </span>
                    )}
                </div>

                {/* Poster body */}
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-6">
                    <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
                        save
                        ? 'bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-black shadow-[0_0_40px_rgba(245,158,11,0.45)] group-hover:scale-110 group-hover:rotate-6'
                        : 'bg-zinc-900 text-zinc-600 border border-zinc-800 group-hover:border-zinc-600 group-hover:text-zinc-400'
                    }`}>
                        {save ? <User size={30} /> : <Plus size={28} />}
                    </div>

                    {save ? (
                        <>
                            <span className="text-xl lg:text-2xl font-black text-white tracking-tight text-center leading-tight">{save.name}</span>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-500/80 mt-1">Starring</span>
                        </>
                    ) : (
                        <>
                            <span className="text-xl font-black text-zinc-600 tracking-tight">Empty Slot</span>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-700 mt-1">Start New Career</span>
                        </>
                    )}
                </div>

                {/* Poster footer */}
                <div className="relative z-10 border-t border-zinc-800/80 pt-3 flex items-center justify-between">
                    {save ? (
                        <>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Calendar size={10}/> Age {save.age}</span>
                                <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Award size={10}/> {save.stats.fame.toLocaleString()} Fame</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-amber-400 transition-colors">
                                <Play size={14} fill="currentColor" />
                            </div>
                        </>
                    ) : (
                        <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-700 w-full text-center">Tap to begin</span>
                    )}
                </div>
            </button>

            {save && (
                <div className="absolute -right-2 -top-2 z-30">
                    {isDeleting ? (
                        <div className="flex items-center gap-1 animate-in zoom-in duration-200">
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteSlot(slot); setConfirmDelete(null); }}
                                className="bg-rose-600 text-white p-2 rounded-full shadow-lg hover:bg-rose-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                className="bg-zinc-700 text-white p-2 rounded-full shadow-lg hover:bg-zinc-600 transition-colors"
                            >
                                <Plus size={14} className="rotate-45" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(slot); }}
                            className="bg-zinc-900 border border-zinc-700 text-zinc-500 p-2 rounded-full shadow-lg hover:bg-rose-900/60 hover:border-rose-600 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="h-full relative flex flex-col items-center justify-center bg-black font-sans overflow-hidden">
        {/* Custom CSS: spotlight sweep, grain, marquee bulbs */}
        <style>{`
            @keyframes float {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob { animation: float 10s infinite ease-in-out; }
            .delay-2000 { animation-delay: 2s; }
            .delay-4000 { animation-delay: 4s; }

            @keyframes spotlight {
                0%   { transform: translateX(-30%) rotate(-8deg); opacity: 0.35; }
                50%  { transform: translateX(30%) rotate(8deg); opacity: 0.6; }
                100% { transform: translateX(-30%) rotate(-8deg); opacity: 0.35; }
            }
            .spotlight {
                position: absolute; top: -40%; left: 50%; width: 60vw; height: 160%;
                margin-left: -30vw;
                background: linear-gradient(to bottom, rgba(251,191,36,0.35), rgba(251,191,36,0.05) 60%, transparent);
                clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%);
                filter: blur(30px);
                animation: spotlight 12s ease-in-out infinite;
                transform-origin: top center;
            }
            .film-grain {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
            }
            @keyframes marquee {
                0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(251,191,36,0.9); }
                50% { opacity: 0.35; box-shadow: none; }
            }
            .bulb { animation: marquee 1.2s infinite; }
            .bulb:nth-child(odd) { animation-delay: 0.6s; }

            @keyframes shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            .gold-text {
                background: linear-gradient(90deg, #fcd34d, #fffbeb, #f59e0b, #fcd34d);
                background-size: 200% auto;
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                animation: shimmer 6s linear infinite;
            }
        `}</style>

        {/* --- SPLASH SCREEN (INTRO) --- */}
        <div className={`absolute inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-1000 ${showSplash ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden">
                {/* Background Effects for Splash */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black"></div>
                <div className="absolute inset-0 film-grain opacity-[0.06]"></div>

                <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-[2000ms]">
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 blur-2xl bg-amber-500/30 rounded-full scale-150"></div>
                        <IndustryGlobeMark size={112} className="relative drop-shadow-[0_0_25px_rgba(245,193,108,0.45)]" />
                    </div>

                    <h1 className="text-3xl font-black gold-text tracking-[0.2em] mb-3 drop-shadow-lg">
                        Industry Globe
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="h-[1px] w-10 bg-gradient-to-r from-transparent to-amber-700"></div>
                        <span className="text-[10px] font-bold text-amber-700 tracking-[0.5em] uppercase">Presents</span>
                        <div className="h-[1px] w-10 bg-gradient-to-l from-transparent to-amber-700"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN MENU --- */}
        <div className={`relative z-10 w-full h-full flex flex-col items-center justify-between py-10 px-4 sm:px-6 transition-all duration-1000 ${showMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>

            {/* Background: stage, spotlight, blobs, grain */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="spotlight" />
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] animate-blob mix-blend-screen" />
                <div className="absolute bottom-[10%] right-[-20%] w-[400px] h-[400px] bg-amber-900/20 rounded-full blur-[80px] animate-blob delay-2000 mix-blend-screen" />
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[60px] animate-blob delay-4000 mix-blend-screen" />

                {/* Stage floor glow */}
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-amber-950/40 via-transparent to-transparent" />

                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 film-grain opacity-[0.06]"></div>
                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.85)_100%)]"></div>
            </div>

            {/* Top Section: Title (Text Only, marquee framed) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className="relative px-8 py-6">
                    {/* Marquee bulbs */}
                    <div className="absolute inset-x-0 top-0 flex justify-between px-2">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <span key={`t${i}`} className="bulb w-1.5 h-1.5 rounded-full bg-amber-300" />
                        ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between px-2">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <span key={`b${i}`} className="bulb w-1.5 h-1.5 rounded-full bg-amber-300" />
                        ))}
                    </div>

                    <div className="flex flex-col items-center">
                    {/* <IndustryGlobeMark size={84} className="mb-4 drop-shadow-[0_10px_30px_rgba(245,193,108,0.35)]" /> */}
                    <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter gold-text leading-[0.85] text-center drop-shadow-[0_10px_40px_rgba(245,158,11,0.3)]">
                        Industry<br/>Globe  
                    </h1>
                    <div className="absolute -right-4 -top-4 text-amber-400 animate-pulse drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                    </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-[0.3em]">
                    <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-amber-800"></span>
                    <span>Version {APP_DISPLAY_VERSION}</span>
                    <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-amber-800"></span>
                </div>
            </div>

            {/* Middle Section: Main Menu or Save Slots */}
            <div className="w-full max-w-sm lg:max-w-4xl space-y-4 relative z-20">
                {view === 'MAIN' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <button
                            onClick={() => setView('SLOTS')}
                            className="group relative w-full py-6 font-black text-xl rounded-full overflow-hidden transition-all active:scale-95 text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 hover:from-amber-200 hover:to-amber-500 shadow-[0_0_60px_rgba(245,158,11,0.35)] flex items-center justify-center gap-3"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-700 pointer-events-none" />
                            <Play size={24} fill="currentColor" className="relative" />
                            <span className="relative tracking-wide">START CAREER</span>
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="text-[10px] font-bold text-amber-500/80 uppercase tracking-[0.5em]">Select Save Slot</div>
                            <button
                                onClick={() => setView('MAIN')}
                                className="text-[10px] font-bold text-zinc-500 hover:text-amber-300 uppercase tracking-widest underline underline-offset-4 transition-colors"
                            >
                                Back
                            </button>
                        </div>

                        <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
                            {[1, 2, 3].map(renderSlot)}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Section: Footer Credits */}
            <div className="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                <div className="text-[10px] text-amber-700 uppercase font-bold tracking-widest">
                    Designed & Built by Sahil
                </div>
            </div>

        </div>
    </div>
  );
};