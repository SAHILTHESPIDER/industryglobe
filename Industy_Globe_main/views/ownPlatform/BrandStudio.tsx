import React, { useEffect, useState } from 'react';
import { Player } from '../../types';
import { REBRAND_USD, brandFrom, rebrandPlatform, sealBrand } from '../../services/ownPlatform/brand';
import { formatCompact } from '../../services/ownPlatform/logic';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import { BrandLockup } from './BrandLockup';
import { BrandColorStep } from './BrandColorStep';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    onClose: () => void;
}

/** Colour, logo, and type. Open until launch, then locked until a rebrand is paid from company cash. */
export const BrandStudio: React.FC<Props> = ({ player, onPlayer, onClose }) => {
    const state = player.ownPlatform;
    const [error, setError] = useState('');
    const [reveal, setReveal] = useState(false);
    useEffect(() => {
        if (!reveal) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const timer = window.setTimeout(() => setReveal(false), reduce ? 0 : 1600);
        return () => window.clearTimeout(timer);
    }, [reveal]);
    if (!state) return null;
    const launched = state.commissioned || state.stage === 'CONSTRUCTING' || state.stage === 'LIVE';
    const locked = Boolean(state.brandLocked);
    const brand = brandFrom(state.brand);
    const setBrand = (next: Partial<typeof brand>) => {
        if (locked) return;
        onPlayer({ ...player, ownPlatform: { ...state, brand: brandFrom({ ...state.brand, ...next }) } });
    };
    const pay = () => {
        const result = rebrandPlatform(player);
        setError(result.error || '');
        if (!result.error) {
            onPlayer(result.player);
            setReveal(true);
        }
    };
    return (
        <div className="empire studio-host" style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
        <div className="studio-scrim" role="dialog" aria-label="Brand studio" data-screen="brand-studio">
            <div className="studio-panel">
                <div className="between">
                    <div>
                        <div className="lab">Brand studio</div>
                        <div className="h3">{locked ? 'Sealed' : 'Open'}</div>
                    </div>
                    <button type="button" className="btn gho sm" onClick={onClose}>Close</button>
                </div>
                {reveal && (
                    <div className="rebrand-reveal" aria-hidden="true">
                        <BrandLockup brand={brand} name={state.name} size="lg" />
                        <div className="rebrand-sweep" />
                    </div>
                )}
                {locked ? (
                    <div className="stack" style={{ marginTop: 16 }}>
                        <BrandLockup brand={brand} name={state.name} size="lg" locked />
                        <p className="p">Colour, logo, and type locked when the build was signed. A rebrand spends {formatCompact(REBRAND_USD)} of company cash. You hold {formatCompact(readCompanyCash(player))}.</p>
                        {error && <p className="p" style={{ color: 'var(--bad)' }}>{error}</p>}
                        <button type="button" className="btn pri" onClick={pay}>Rebrand</button>
                    </div>
                ) : (
                    <BrandColorStep
                        name={state.name}
                        brand={brand}
                        stepLabel={launched ? 'Rebrand' : 'Before launch'}
                        hint={launched ? 'The fee is already paid. Seal the look when it is right.' : 'Change the colour, the mark, and the type any time until you sign the build.'}
                        continueLabel={launched ? 'Lock this look' : 'Done'}
                        onColor={colorId => setBrand({ colorId })}
                        onMark={markId => setBrand({ markId })}
                        onFrame={frameId => setBrand({ frameId })}
                        onTypeface={typefaceId => setBrand({ typefaceId })}
                        onContinue={() => {
                            if (launched) onPlayer(sealBrand({ ...player, ownPlatform: { ...state, brand } }));
                            onClose();
                        }}
                    />
                )}
            </div>
        </div>
        </div>
    );
};
