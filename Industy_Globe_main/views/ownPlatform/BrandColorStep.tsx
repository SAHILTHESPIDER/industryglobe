import React from 'react';
import { PlatformBrand } from '../../types';
import { BRAND_COLORS, brandFrom, colorById } from '../../services/ownPlatform/brand';
import { BrandLockup } from './BrandLockup';
import { BrandMark } from './BrandMark';

interface Props {
    name: string;
    brand: PlatformBrand;
    onColor: (colorId: string) => void;
    onContinue: () => void;
    continueLabel?: string;
    kicker?: string;
    hint?: string;
}

/** Step 1 of founding or buying: the colour, then the rest of the flow. */
export const BrandColorStep: React.FC<Props> = ({
    name,
    brand,
    onColor,
    onContinue,
    continueLabel = 'Next · Name it',
    kicker = 'Step 1 · Brand colour',
    hint = 'The colour stays on the company. Name, markets, and the rest of the launch come after this.',
}) => {
    const picked = colorById(brand.colorId);
    const letter = (name.trim() || 'E').slice(0, 1);
    return (
        <div className="colour-step" data-screen="brand-colour">
            <div className="colour-copy">
                <div className="lab">{kicker}</div>
                <h2 className="h2" style={{ marginTop: 8 }}>Pick the colour</h2>
                <p className="p" style={{ marginTop: 8, maxWidth: 560 }}>{hint}</p>
                <div className="swatches" role="listbox" aria-label="Brand colour">
                    {BRAND_COLORS.map(swatch => {
                        const on = picked.id === swatch.id;
                        return (
                            <button
                                key={swatch.id}
                                type="button"
                                role="option"
                                aria-selected={on}
                                className={`swatch-btn${on ? ' on' : ''}`}
                                onClick={() => onColor(swatch.id)}
                                style={{ ['--swatch' as string]: swatch.hex }}
                            >
                                <i style={{ background: swatch.hex }} />
                                <span>{swatch.name}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="small" style={{ marginTop: 10 }}>{picked.blurb}</p>
                <button type="button" className="btn pri" style={{ marginTop: 16 }} onClick={onContinue}>{continueLabel}</button>
            </div>
            <aside className="colour-preview" aria-label="Live platform preview">
                <div className="lab">Live preview</div>
                <div className="billboard" style={{ background: `radial-gradient(120% 120% at 20% 0%, ${picked.hex}, #07080d 70%)` }}>
                    <BrandLockup brand={brandFrom({ ...brand, colorId: picked.id })} name={name} size="lg" />
                    <small>Originals · Films · Series</small>
                </div>
                <div className="icon-row">
                    <div className="app-icon" style={{ borderColor: picked.hex, boxShadow: `0 0 24px ${picked.hex}55` }}>
                        <BrandMark id={brand.markId} color={picked.hex} size={36} letter={letter} />
                    </div>
                    <div>
                        <div className="tiny">App icon</div>
                        <div className="h3" style={{ color: picked.hex }}>{(name.trim() || 'Empire').toUpperCase()}</div>
                    </div>
                </div>
            </aside>
        </div>
    );
};
