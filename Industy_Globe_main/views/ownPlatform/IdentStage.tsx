import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { playIdentSting, stopIdentSting, takeArmedIdent } from '../../services/ownPlatform/identAudio';
import { identityById } from '../../services/ownPlatform/logic';
import { headingFont } from './ui';

const IDENT_MS = 1400;

export const IdentStage: React.FC<{ name: string; accent: string; playing: boolean; className?: string }> = ({ name, accent, playing, className = '' }) => (
    <div className={`relative h-36 overflow-hidden rounded-3xl bg-black border border-white/10 ${className}`} data-testid="ident-stage">
        <style>{`
            @keyframes ident-in { 0% { transform: scale(0.72); opacity: 0; filter: brightness(2.4); } 40% { opacity: 1; } 100% { transform: scale(1); opacity: 1; filter: brightness(1); } }
            .ident-play { animation: ident-in 1.15s ease both; }
        `}</style>
        <div className={`absolute inset-0 flex items-center justify-center gap-4 ${playing ? 'ident-play' : ''}`}>
            <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl font-black" style={{ background: accent, color: '#05060a' }}>▶</div>
            <div>
                <div className="text-3xl font-black uppercase tracking-wide" style={{ fontFamily: headingFont, color: accent }}>{(name || 'Empire').toUpperCase()}</div>
                <div className="text-[10px] tracking-[0.35em] text-zinc-400">ORIGINALS</div>
            </div>
        </div>
    </div>
);

/** Short logo + sting. Tap skips. The page underneath stays usable. */
export const IdentBumper: React.FC<{ name: string; identityId: string; onDone: () => void; purpose?: 'visit' | 'title' }> = ({ name, identityId, onDone, purpose = 'visit' }) => {
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    const preset = identityById(identityId);

    useEffect(() => {
        if (purpose === 'title') window.dispatchEvent(new Event('empire-ident-title'));
        const token = takeArmedIdent(identityId) ?? playIdentSting(identityId);
        const timer = window.setTimeout(() => onDoneRef.current(), IDENT_MS);
        const onTitle = () => onDoneRef.current();
        if (purpose === 'visit') window.addEventListener('empire-ident-title', onTitle);
        return () => {
            window.clearTimeout(timer);
            if (purpose === 'visit') window.removeEventListener('empire-ident-title', onTitle);
            stopIdentSting(token);
        };
    }, [identityId, purpose]);

    return createPortal(
        <div className="fixed bottom-6 left-1/2 z-[260] w-[min(520px,calc(100%-2rem))] -translate-x-1/2" data-testid="ident-bumper">
            <button type="button" onClick={() => onDoneRef.current()} className="w-full text-left" aria-label="Skip ident">
                <IdentStage name={name} accent={preset.accent} playing />
                <div className="mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-zinc-400">Tap to skip</div>
            </button>
        </div>,
        document.body,
    );
};
