import React from 'react';
import { OwnPlatformState, PlatformBrand } from '../../types';
import { LaunchQuote, formatCompact, formatPeople } from '../../services/ownPlatform/logic';
import { BRAND_LOCKUPS, BRAND_MARKS, BRAND_TYPEFACES, brandFrom, lockupById, markById, typefaceById } from '../../services/ownPlatform/brand';
import { BrandLockup } from './BrandLockup';
import { BrandMark } from './BrandMark';

interface Props {
    state: OwnPlatformState;
    locked: boolean;
    quote: LaunchQuote;
    onName: (name: string) => void;
    onBrand: (brand: PlatformBrand) => void;
}

export const NameIt: React.FC<Props> = ({ state, locked, quote, onName, onBrand }) => {
    const name = state.name || '';
    const brand = brandFrom(state.brand);
    const mark = markById(brand.markId);
    const face = typefaceById(brand.typefaceId);
    const lockup = lockupById(brand.lockupId);
    const letter = (name.trim() || 'E').slice(0, 1);
    const patch = (next: Partial<PlatformBrand>) => {
        if (locked) return;
        onBrand(brandFrom({ ...brand, ...next }));
    };

    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4" data-screen="brand-generator">
            <div className="stack">
                <div className="card sel" style={{ padding: '22px 24px' }}>
                    <label className="flab" htmlFor="empire-name">Service name · what the world will type</label>
                    <div className="between">
                        <input
                            id="empire-name"
                            className="name-hero"
                            value={name}
                            disabled={locked}
                            maxLength={32}
                            onChange={event => onName(event.target.value.slice(0, 32))}
                            aria-label="Service name"
                        />
                        <div className="mono small">{name.length} / 32</div>
                    </div>
                    <div className="small" style={{ marginTop: 8 }}>Short names survive on a billboard. You get the “+” free. The mark, the type, and the lockup travel with it.</div>
                </div>

                <div>
                    <div className="lab">Mark · {mark.name}</div>
                    <p className="small" style={{ marginTop: 4 }}>{mark.blurb}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-3">
                        {BRAND_MARKS.map(row => (
                            <button
                                key={row.id}
                                type="button"
                                disabled={locked}
                                onClick={() => patch({ markId: row.id })}
                                className={`rounded-2xl border p-2 text-center ${brand.markId === row.id ? 'border-[#4F3BFF] bg-[#4F3BFF]/15' : 'border-white/10 bg-[#12151c]'}`}
                            >
                                <span className="mx-auto grid place-items-center h-10"><BrandMark id={row.id} color={row.accent} size={28} letter={letter} /></span>
                                <span className="block text-[10px] uppercase tracking-wider mt-1 text-zinc-300">{row.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="lab">Type · {face.name}</div>
                    <p className="small" style={{ marginTop: 4 }}>{face.blurb}</p>
                    <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                        {BRAND_TYPEFACES.map(row => (
                            <button
                                key={row.id}
                                type="button"
                                disabled={locked}
                                onClick={() => patch({ typefaceId: row.id })}
                                className={`shrink-0 rounded-2xl border px-3 py-2 text-left ${brand.typefaceId === row.id ? 'border-[#4F3BFF] bg-[#4F3BFF]/15' : 'border-white/10 bg-[#12151c]'}`}
                            >
                                <span className="block text-lg leading-none" style={{ fontFamily: row.css }}>{(name.trim() || 'Empire').slice(0, 12)}</span>
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-400 mt-1">{row.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="lab">Lockup · {lockup.name}</div>
                    <p className="small" style={{ marginTop: 4 }}>{lockup.blurb}</p>
                    <div className="grid sm:grid-cols-2 gap-2 mt-3">
                        {BRAND_LOCKUPS.map(row => (
                            <button
                                key={row.id}
                                type="button"
                                disabled={locked}
                                onClick={() => patch({ lockupId: row.id })}
                                className={`rounded-2xl border p-3 text-left overflow-hidden ${brand.lockupId === row.id ? 'border-[#4F3BFF] bg-[#4F3BFF]/15' : 'border-white/10 bg-[#12151c]'}`}
                            >
                                <BrandLockup brand={{ ...brand, lockupId: row.id }} name={name} size="sm" />
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-400 mt-2">{row.name} · {row.blurb}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <aside className="stack lg:sticky lg:top-3 self-start">
                <div className="lab">Live preview</div>
                <div className="card" style={{ background: mark.ink, borderColor: mark.accent, minHeight: 120, display: 'flex', alignItems: 'center' }}>
                    <BrandLockup brand={brand} name={name} size="md" />
                </div>
                <div className="card" style={{ display: 'grid', placeItems: 'center', background: '#15172A' }}>
                    <div style={{ width: 74, height: 74, borderRadius: 18, background: mark.ink, border: `1px solid ${mark.accent}`, display: 'grid', placeItems: 'center' }}>
                        <BrandMark id={mark.id} color={mark.accent} size={40} letter={letter} />
                    </div>
                    <div className="tiny" style={{ marginTop: 8 }}>App icon</div>
                </div>
                <div className="card bill">
                    <div className="lab">Launch bill · nothing paid yet</div>
                    <div className="tot" style={{ marginTop: 8 }}>{formatCompact(quote.dueNow)}</div>
                    <div className="tiny" style={{ marginBottom: 6 }}>due at commission</div>
                    <div className="line"><span>Weekly burn</span><span>{formatCompact(quote.weeklyBurn)}</span></div>
                    <div className="line"><span>Forecast homes</span><span style={{ color: 'var(--go)' }}>{formatPeople(quote.households)}</span></div>
                    <div className="line" style={{ border: 0 }}><span>Piracy</span><span>{Math.round((Number.isFinite(quote.piracyShare) ? quote.piracyShare : 0) * 100)}% of viewing</span></div>
                </div>
                <div className="card flat">
                    <div className="lab" style={{ color: 'var(--volt)' }}>This step</div>
                    <p className="p" style={{ marginTop: 6 }}>{mark.name} in {face.name}, {lockup.name.toLowerCase()} lockup. Nothing is paid here. The face carries into the ident and the storefront preview.</p>
                </div>
            </aside>
        </div>
    );
};
