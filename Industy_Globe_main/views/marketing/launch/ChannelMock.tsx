import React from 'react';
import type { PlatformBrand } from '../../../types';
import { brandAccent, typefaceById } from '../../../services/ownPlatform/brand';
import type { LaunchAnim } from '../../../services/marketing/launchCatalog';
import { BrandMark } from '../../ownPlatform/BrandMark';

const labelFor = (name: string, script: boolean) => {
    const clean = name.trim() || 'Empire';
    const word = script ? clean : clean.toUpperCase();
    return word.endsWith('+') ? word : `${word}+`;
};

const Plate: React.FC<{ name: string; brand: PlatformBrand }> = ({ name, brand }) => {
    const accent = brandAccent(brand);
    const face = typefaceById(brand.typefaceId);
    const label = labelFor(name, brand.typefaceId === 'script');
    return (
        <span className="plate" style={{ color: accent, fontFamily: face.css }}>
            <BrandMark id={brand.markId} color={accent} size={16} letter={label} />
            <b style={{ fontFamily: face.css }}>{label}</b>
        </span>
    );
};

const NEEDS_PLATE = ['search', 'bus', 'taxi', 'shelter', 'flyers', 'city', 'radio', 'podcast', 'print', 'cinema', 'jersey', 'light', 'drone', 'fest', 'stunt', 'carpet', 'mob', 'sky', 'projection', 'campus', 'press', 'telecom', 'collab'];

/** A moving mock of the medium, with the live platform lockup inside it. */
export const ChannelMock: React.FC<{ anim: LaunchAnim; brand: PlatformBrand; name: string }> = ({ anim, brand, name }) => {
    const accent = brandAccent(brand);
    const plate = <Plate name={name} brand={brand} />;
    return (
        <div className="mock" data-anim={anim} style={{ ['--accent' as string]: accent }}>
            {anim === 'feed' && (
                <div className="feed-col">
                    {[0, 1, 2, 3, 4, 5].map(index => (
                        <div className="feed-post" key={index}>
                            <BrandMark id={brand.markId} color={accent} size={14} letter={name} />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: 6, width: '70%', background: '#24324a', borderRadius: 4 }} />
                                <div style={{ height: 6, width: '46%', background: '#1a2438', borderRadius: 4, marginTop: 4 }} />
                            </div>
                        </div>
                    ))}
                    <i className="heart" style={{ right: 8, top: 20 }}>♥</i>
                    <i className="heart" style={{ right: 18, top: 40, animationDelay: '.6s' }}>♥</i>
                </div>
            )}
            {anim === 'video' && (<><div style={{ position: 'absolute', left: '28%', top: 8, bottom: 8, width: '44%', borderRadius: 12, border: '2px solid #2a3550', background: '#0a1020' }} />{plate}<div className="playbar"><i /></div></>)}
            {anim === 'search' && (
                <div style={{ position: 'absolute', left: 10, right: 10, top: 16, height: 28, borderRadius: 99, background: '#0c1220', border: '1px solid #2a3550', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
                    <span style={{ opacity: .7 }}>⌕</span><span style={{ fontSize: 12 }}>{name || 'play'}<i className="caret" /></span>
                </div>
            )}
            {anim === 'ctv' && (<><div style={{ position: 'absolute', left: '12%', right: '12%', top: 16, bottom: 22, borderRadius: 8, background: '#08101c', boxShadow: `0 0 24px ${accent}55` }} />{plate}</>)}
            {anim === 'game' && (<><div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, height: 8, background: '#1c3f2a' }} /><div className="jump" style={{ position: 'absolute', left: 16, bottom: 26, width: 14, height: 18, background: accent, borderRadius: 3 }} />{plate}</>)}
            {anim === 'music' && (<><div className="vinyl" style={{ position: 'absolute', left: '18%', top: 18, width: 64, height: 64, borderRadius: '50%', background: `conic-gradient(#111, ${accent}, #111)` }} />{plate}</>)}
            {anim === 'live' && (<><div style={{ position: 'absolute', left: 8, top: 8, fontSize: 10, letterSpacing: '.08em', background: '#e11d48', borderRadius: 99, padding: '2px 6px' }}>24.1K watching</div>{plate}<i className="heart" style={{ right: 16, bottom: 20 }}>♥</i><i className="heart" style={{ right: 28, bottom: 12, animationDelay: '.4s' }}>♥</i><i className="heart" style={{ right: 10, bottom: 28, animationDelay: '.8s' }}>♥</i></>)}
            {anim === 'celeb' && (<><div style={{ position: 'absolute', left: '8%', top: 16, width: 54, height: 54, borderRadius: '50%', background: 'radial-gradient(circle at 40% 30%, #f2d2b0, #8a5a48)' }} />{plate}</>)}
            {anim === 'tv' && (<><div style={{ position: 'absolute', left: '18%', right: '18%', top: 12, bottom: 20, background: '#06101c', borderRadius: 6 }} />{plate}<div className="playbar"><i /></div></>)}
            {anim === 'board' && (<><div className="bulb" style={{ position: 'absolute', left: '10%', right: '10%', top: 18, bottom: 28, background: '#0c1424', border: `2px solid ${accent}`, boxShadow: `0 0 18px ${accent}` }} />{plate}</>)}
            {anim === 'train' && (<><div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, height: 4, background: '#31415c' }} /><div className="train" style={{ width: 92, height: 28, background: accent, borderRadius: 4 }} /></>)}
            {anim === 'bus' && <div className="bus" style={{ width: 86, height: 32, background: '#16325c', borderRadius: 6, borderBottom: `4px solid ${accent}` }} />}
            {anim === 'taxi' && <div className="taxi" style={{ width: 64, height: 26, background: '#e4b15a', borderRadius: 6 }} />}
            {anim === 'shelter' && [0, 1, 2].map(index => <div key={index} style={{ position: 'absolute', left: 16 + index * 28, top: 20, width: 22, height: 36, background: index === 1 ? accent : '#152238', borderRadius: 2 }} />)}
            {anim === 'flyers' && (<><i className="flyer" style={{ left: '18%', top: 24, background: accent }} /><i className="flyer" style={{ left: '42%', top: 16, animationDelay: '.3s', background: '#1d4ed8' }} /><i className="flyer" style={{ left: '64%', top: 30, animationDelay: '.6s', background: '#0f172a', border: `1px solid ${accent}` }} /></>)}
            {anim === 'airport' && [0, 1, 2].map(index => <div key={index} className="screen-slide" style={{ animationDelay: `${index * 2}s`, background: index === 1 ? '#10243f' : '#0b1424', border: `1px solid ${accent}` }}>{index === 0 ? plate : null}</div>)}
            {anim === 'mall' && (<><div style={{ position: 'absolute', left: '30%', top: 0, bottom: 0, width: 18, background: `repeating-linear-gradient(${accent}55, ${accent}55 6px, transparent 6px, transparent 12px)`, animation: 'feed-scroll 2s linear infinite' }} />{plate}</>)}
            {anim === 'city' && [0, 1, 2, 3].map(index => <div key={index} className="screen-slide" style={{ animationDelay: `${index * 1.5}s`, left: `${8 + index * 22}%`, right: 'auto', width: '18%', background: index % 2 ? accent : '#102038' }} />)}
            {anim === 'times' && (<><div className="bulb" style={{ position: 'absolute', inset: 10, background: `linear-gradient(180deg, ${accent}, #102040)` }} />{plate}</>)}
            {(anim === 'radio' || anim === 'podcast') && [0, 1, 2, 3, 4].slice(0, anim === 'radio' ? 3 : 5).map(index => <i key={index} className="wave" style={{ position: 'absolute', left: 16 + index * 14, bottom: 16, width: 6, height: 18 + (index % 3) * 10, background: accent, display: 'block', animationDelay: `${index * .15}s` }} />)}
            {anim === 'print' && <div style={{ position: 'absolute', left: 16, top: 12, width: '70%', height: '80%', background: '#f3efe4', color: '#1a140c', padding: 6 }}><div style={{ fontSize: 10, fontWeight: 800 }}>{name}</div></div>}
            {anim === 'cinema' && (<><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '18%', background: '#4a1020' }} /><div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '18%', background: '#4a1020' }} /></>)}
            {anim === 'stadium' && (<><div className="bulb" style={{ position: 'absolute', left: '8%', right: '8%', top: 16, height: 28, background: '#04140c', border: `2px solid ${accent}` }} />{plate}</>)}
            {anim === 'jersey' && <div style={{ position: 'absolute', left: '30%', top: 16, width: 70, height: 78, background: accent, clipPath: 'polygon(20% 0, 80% 0, 100% 18%, 82% 18%, 82% 100%, 18% 100%, 18% 18%, 0 18%)' }} />}
            {anim === 'reveal' && (<><div style={{ position: 'absolute', left: '38%', bottom: 0, width: '24%', top: 8, background: '#1a2744' }} /><div className="banner" style={{ position: 'absolute', left: '30%', top: 8, width: '40%', height: '46%', background: accent }} /></>)}
            {anim === 'light' && (<><div style={{ position: 'absolute', left: '40%', bottom: 0, width: 28, top: 6, background: '#0e1a30' }} /><div className="beam" style={{ position: 'absolute', left: '46%', top: 0, width: 8, height: '70%', background: `linear-gradient(${accent}, transparent)` }} /></>)}
            {anim === 'drone' && Array.from({ length: 8 }, (_, index) => <i key={index} className="drone-dot" style={{ left: `${20 + (index % 4) * 16}%`, top: `${24 + Math.floor(index / 4) * 22}%`, animationDelay: `${index * .12}s`, ['--from' as string]: `${(index - 3) * 10}px`, ['--fy' as string]: `${index * 4}px` }} />)}
            {anim === 'fest' && (<><div className="beam" style={{ position: 'absolute', left: '20%', top: 0, width: 10, height: '80%', background: 'linear-gradient(#7eb0ff, transparent)' }} /><div className="crowd" style={{ position: 'absolute', bottom: 8, left: 8 }}>{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ animationDelay: `${index * .1}s` }} />)}</div></>)}
            {anim === 'stunt' && <div className="jump" style={{ position: 'absolute', left: 10, bottom: 16, width: 28, height: 12, background: accent, borderRadius: 4 }} />}
            {anim === 'carpet' && <div style={{ position: 'absolute', left: '30%', bottom: 0, width: '40%', top: 20, background: 'linear-gradient(#7f1d1d, #3f0d12)' }} />}
            {anim === 'mob' && <div className="crowd" style={{ position: 'absolute', bottom: 10, left: 8 }}>{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ animationDelay: `${index * .15}s`, background: accent }} />)}</div>}
            {anim === 'sky' && <div className="balloon" style={{ position: 'absolute', left: '40%', top: 16, width: 28, height: 34, borderRadius: '40%', background: accent }} />}
            {anim === 'projection' && <div style={{ position: 'absolute', left: '28%', bottom: 0, borderLeft: '40px solid transparent', borderRight: '40px solid transparent', borderBottom: '90px solid #1c2a44' }} />}
            {anim === 'campus' && <div style={{ position: 'absolute', left: '16%', bottom: 0, width: '68%', height: '60%', background: '#18243a', borderTop: `4px solid ${accent}` }} />}
            {anim === 'popup' && (<><div style={{ position: 'absolute', left: '22%', bottom: 0, width: '56%', height: '70%', background: '#121a2c', border: `2px solid ${accent}` }} />{plate}</>)}
            {anim === 'press' && <div style={{ position: 'absolute', bottom: 14, left: 12, display: 'flex', gap: 8 }}>{[0, 1, 2].map(index => <i key={index} style={{ width: 8, height: 28, background: '#cbd5e1', display: 'block', borderRadius: 4 }} />)}</div>}
            {anim === 'telecom' && (<><div style={{ position: 'absolute', left: '18%', top: 20, width: 22, height: 40, borderRadius: 4, border: `2px solid ${accent}` }} /><div style={{ position: 'absolute', right: '18%', top: 20, width: 36, height: 24, borderRadius: 4, border: '2px solid #7eb0ff' }} /></>)}
            {anim === 'collab' && (<><div style={{ position: 'absolute', left: '16%', top: 28, padding: '4px 8px', borderRadius: 99, background: accent, color: '#041018', fontSize: 11, fontWeight: 800 }}>{name}</div><div style={{ position: 'absolute', right: '12%', top: 36, padding: '4px 8px', borderRadius: 99, border: '1px solid #e4b15a', fontSize: 11 }}>PARTNER</div></>)}
            {NEEDS_PLATE.includes(anim) && plate}
        </div>
    );
};
