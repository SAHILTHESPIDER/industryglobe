import React from 'react';
import { PlatformBrand } from '../../types';
import { BRAND_COLORS, BRAND_FRAMES, BRAND_TYPEFACES, STUDIO_MARKS, brandFrom, colorById, markById, typefaceById } from '../../services/ownPlatform/brand';
import { BrandLockup } from './BrandLockup';
import { BrandMark } from './BrandMark';

interface Props {
    name: string;
    brand: PlatformBrand;
    onColor: (colorId: string) => void;
    onMark?: (markId: string) => void;
    onFrame?: (frameId: 'circle' | 'rounded' | 'none') => void;
    onTypeface?: (typefaceId: string) => void;
    onContinue: () => void;
    continueLabel?: string;
    stepLabel?: string;
    hint?: string;
}

/** Step 1: brand colour and the name's type, then the rest of the flow. */
export const BrandColorStep: React.FC<Props> = ({
    name,
    brand,
    onColor,
    onMark,
    onFrame,
    onTypeface,
    onContinue,
    continueLabel = 'Next · Name it',
    stepLabel = 'Step 1 of 8',
    hint = 'Colour and type stay on the company. The name, the markets, and the rest of the launch come after this.',
}) => {
    const picked = colorById(brand.colorId);
    const mark = markById(brand.markId);
    const face = typefaceById(brand.typefaceId);
    const frame = brand.frameId === 'circle' || brand.frameId === 'rounded' ? brand.frameId : 'none';
    const live = brandFrom(brand);
    const letter = (name.trim() || 'E').slice(0, 1);
    const shown = (name.trim() || 'Empire');
    return (
        <div className="colour-step" data-screen="brand-colour">
            <div className="colour-copy">
                <div className="step-head">
                    <span className="step-pill">{stepLabel}</span>
                    <span className="lab">Brand</span>
                </div>
                <h2 className="h2" style={{ marginTop: 10 }}>Colour, logo, type</h2>
                <p className="p" style={{ marginTop: 8, maxWidth: 640 }}>{hint}</p>
                <div className="lab" style={{ marginTop: 18 }}>Colour</div>
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
                                <i />
                                <span>{swatch.name}</span>
                            </button>
                        );
                    })}
                </div>
                {onMark && (
                    <>
                        <div className="lab" style={{ marginTop: 18 }}>Logo · {mark.name}</div>
                        <div className="logo-grid" role="listbox" aria-label="Logo mark">
                            {STUDIO_MARKS.map(id => {
                                const row = markById(id);
                                const on = mark.id === id;
                                return (
                                    <button key={id} type="button" role="option" aria-selected={on} className={`logo-card${on ? ' on' : ''}`} onClick={() => onMark(id)}>
                                        <span className={`mark-frame ${frame === 'none' ? 'rounded' : frame}`} style={{ borderColor: picked.hex }}>
                                            <BrandMark id={id} color={on ? picked.hex : '#C8CBDA'} size={28} letter={letter} />
                                        </span>
                                        <span>{row.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {onFrame && (
                            <div className="frame-row" role="listbox" aria-label="Logo frame">
                                {BRAND_FRAMES.map(row => (
                                    <button key={row.id} type="button" className={`chip${frame === row.id ? ' on' : ''}`} onClick={() => onFrame(row.id)}>{row.name}</button>
                                ))}
                            </div>
                        )}
                    </>
                )}
                {onTypeface && (
                    <>
                        <div className="lab" style={{ marginTop: 18 }}>Type · {face.name}</div>
                        <div className="font-cards" role="listbox" aria-label="Brand type">
                            {BRAND_TYPEFACES.map(row => {
                                const on = face.id === row.id;
                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        role="option"
                                        aria-selected={on}
                                        className={`font-card${on ? ' on' : ''}`}
                                        onClick={() => onTypeface(row.id)}
                                    >
                                        <em style={{ fontFamily: row.css, fontStyle: row.id === 'script' ? 'italic' : 'normal', textTransform: row.id === 'script' ? 'none' : 'uppercase' }}>{shown}</em>
                                        <span>{row.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
                <p className="small" style={{ marginTop: 10 }}>{picked.blurb} {face.blurb}</p>
                <button type="button" className="btn pri" style={{ marginTop: 16 }} onClick={onContinue}>{continueLabel}</button>
            </div>
            <aside className="colour-preview" aria-label="Live platform preview">
                <div className="lab">Live preview</div>
                <div key={`${picked.id}-${face.id}`} className="preview-pop">
                    <div className="billboard" style={{ background: `radial-gradient(120% 120% at 20% 0%, ${picked.hex}, #07080d 72%)`, boxShadow: `0 0 40px ${picked.hex}44` }}>
                        <BrandLockup brand={live} name={name} size="lg" />
                        <small>Originals · Films · Series</small>
                    </div>
                    <div className="preview-row">
                        <div className="app-icon" style={{ borderColor: picked.hex, boxShadow: `0 0 24px ${picked.hex}66` }}>
                            <BrandMark id={live.markId} color={picked.hex} size={36} letter={letter} />
                        </div>
                        <div className="phone-frame" style={{ borderColor: '#E4B15A' }}>
                            <div className="phone-notch" />
                            <div className="phone-screen" style={{ background: `linear-gradient(180deg, ${picked.hex}, #07080d 78%)` }}>
                                <BrandLockup brand={{ ...live, lockupId: 'stacked' }} name={name} size="sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};
