import React, { useEffect, useState } from 'react';
import type { PlatformBrand } from '../../../types';
import { brandAccent, typefaceById } from '../../../services/ownPlatform/brand';
import { formatPeople } from '../../../services/ownPlatform/logic';
import { flightMoney, type FlightQuote } from '../../../services/marketing/launchCatalog';
import { BrandMark } from '../../ownPlatform/BrandMark';
import './launch.css';

export interface NightStop {
    id: string;
    name: string;
    country: string;
    lat: number;
    lon: number;
    anim: string;
    event: string;
}

const project = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 });

const Skyline = () => (
    <>
        <i className="sky-tower" style={{ left: '6%', height: '38%' }} />
        <i className="sky-tower" style={{ left: '18%', height: '62%', width: '10%' }} />
        <i className="sky-tower" style={{ left: '32%', height: '48%' }} />
        <i className="sky-tower" style={{ left: '48%', height: '78%', width: '8%' }} />
        <i className="sky-tower" style={{ left: '62%', height: '44%' }} />
        <i className="sky-tower" style={{ left: '76%', height: '58%', width: '12%' }} />
    </>
);

const Scene: React.FC<{ anim: string; city: string; service: string; brand: PlatformBrand; event: string }> = ({ anim, city, service, brand, event }) => {
    const accent = brandAccent(brand);
    const face = typefaceById(brand.typefaceId);
    const word = (service.trim() || 'EMPIRE').toUpperCase();
    const label = word.endsWith('+') ? word : `${word}+`;
    return (
        <div className="night-sky" data-scene={anim}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 20%, #1a2d55, #05070e 60%)' }} />
            <Skyline />
            {anim === 'drone' && Array.from({ length: 18 }, (_, index) => {
                const angle = (index / 18) * Math.PI * 2;
                const ring = index < 12;
                const x = ring ? 50 + Math.cos(angle) * 16 : 50;
                const y = ring ? 32 + Math.sin(angle) * 12 : 18 + (index - 12) * 4;
                return <i key={index} className="drone-dot" style={{ left: `${x}%`, top: `${y}%`, background: accent, animationDelay: `${index * 0.05}s`, width: 7, height: 7 }} />;
            })}
            {anim === 'reveal' && (
                <div className="banner" style={{ position: 'absolute', left: '30%', top: 0, width: '28%', height: '78%', background: `linear-gradient(180deg, #fff 0%, ${accent} 18%, ${accent} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: face.css, fontWeight: 800, writingMode: 'vertical-rl', fontSize: 42, letterSpacing: '0.08em', boxShadow: '0 0 40px #000a' }}>
                    {label}
                </div>
            )}
            {anim === 'light' && (
                <>
                    <div className="beam" style={{ position: 'absolute', left: '48%', top: 0, width: 14, height: '78%', background: `linear-gradient(${accent}, transparent)` }} />
                    <div className="beam" style={{ position: 'absolute', left: '42%', top: 0, width: 10, height: '70%', background: 'linear-gradient(#E4B15A, transparent)', animationDelay: '.4s' }} />
                </>
            )}
            {anim === 'fest' && (
                <>
                    <div className="beam" style={{ left: '20%', position: 'absolute', top: 0, width: 16, height: '80%', background: 'linear-gradient(#7eb6ff, transparent)' }} />
                    <div className="beam" style={{ left: '70%', position: 'absolute', top: 0, width: 16, height: '80%', background: 'linear-gradient(#E4B15A, transparent)', animationDelay: '.5s' }} />
                    <div className="crowd" style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 0.08}s`, height: 18 }} />)}</div>
                </>
            )}
            {anim === 'stunt' && (
                <>
                    <div style={{ position: 'absolute', left: '8%', bottom: 28, width: '46%', height: 8, background: '#243049', transform: 'rotate(-8deg)' }} />
                    <div className="jump" style={{ position: 'absolute', left: '18%', bottom: 40, width: 42, height: 16, borderRadius: 4, background: accent }} />
                    <i className="heart" style={{ left: '62%', top: 24, color: '#E4B15A' }}>✦</i>
                    <i className="heart" style={{ left: '74%', top: 12, animationDelay: '.3s', color: '#fff' }}>✦</i>
                </>
            )}
            {!['drone', 'reveal', 'light', 'fest', 'stunt'].includes(anim) && (
                <div className="balloon" style={{ position: 'absolute', left: '34%', top: '22%', padding: '8px 12px', border: `2px solid ${accent}`, borderRadius: 12, fontFamily: face.css }}>{label}</div>
            )}
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BrandMark id={brand.markId} color={accent} size={28} letter={label} />
                <span style={{ fontFamily: face.css, color: accent, fontWeight: 800, fontSize: 22 }}>{label}</span>
            </div>
            <div className="night-name"><span>{event}</span><b>{city}</b></div>
        </div>
    );
};

const useTick = (value: number, run: boolean) => {
    const [shown, setShown] = useState(run ? 0 : value);
    useEffect(() => {
        if (!run) {
            setShown(value);
            return undefined;
        }
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / 1400);
            setShown(value * (1 - (1 - t) ** 3));
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, run]);
    return shown;
};

export const LaunchNight: React.FC<{
    stops: NightStop[];
    brand: PlatformBrand;
    service: string;
    quote: FlightQuote;
    live: boolean;
    hold?: 'drone' | 'reveal' | 'results';
    onClose: () => void;
}> = ({ stops, brand, service, quote, live, hold, onClose }) => {
    const sequence = stops.length ? stops : [{ id: 'bom', name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88, anim: hold === 'reveal' ? 'reveal' : 'drone', event: hold === 'reveal' ? 'Building reveal' : 'Drone show' }];
    const [index, setIndex] = useState(0);
    const showResults = hold === 'results' || index >= sequence.length;
    useEffect(() => {
        if (hold || showResults) return undefined;
        const timer = window.setTimeout(() => setIndex(value => value + 1), 2800);
        return () => window.clearTimeout(timer);
    }, [index, hold, showResults]);
    const stop = sequence[Math.min(index, sequence.length - 1)];
    const reach = useTick(quote.reach, showResults && !hold);
    const buzz = useTick(quote.buzz, showResults && !hold);
    const subs = useTick(quote.subscribers, showResults && !hold);
    const scene = hold === 'reveal' ? 'reveal' : hold === 'drone' ? 'drone' : stop.anim;
    const event = hold === 'reveal' ? 'Building reveal' : hold === 'drone' ? 'Drone show' : stop.event;
    return (
        <div className="night" data-screen={showResults ? 'launch-results' : 'launch-night'} data-scene={showResults ? 'results' : scene}>
            {!showResults && (
                <>
                    <button type="button" className="skip" onClick={() => setIndex(sequence.length)}>Skip to results</button>
                    <Scene anim={scene} city={stop.name} service={service} brand={brand} event={event} />
                    <div className="night-map" aria-hidden="true">
                        <svg viewBox="0 0 360 120">
                            <ellipse cx="180" cy="64" rx="150" ry="46" fill="#10233f" />
                            <ellipse cx="80" cy="58" rx="48" ry="28" fill="#16345c" />
                            <ellipse cx="200" cy="52" rx="58" ry="24" fill="#16345c" />
                            <ellipse cx="270" cy="78" rx="34" ry="16" fill="#16345c" />
                            {sequence.map(item => {
                                const point = project(item.lat, item.lon);
                                const on = item.id === stop.id;
                                return <circle key={item.id} cx={(point.x / 100) * 360} cy={(point.y / 100) * 120} r={on ? 5.5 : 3} fill={on ? '#7eb6ff' : '#E4B15A'} />;
                            })}
                        </svg>
                    </div>
                </>
            )}
            {showResults && (
                <div className="launch-scroll results">
                    <div className="launch-kicker">{live ? 'On the books' : 'Lands on opening night'}</div>
                    <h2>{service} is in the city.</h2>
                    <p style={{ color: '#b7c3da', maxWidth: 640 }}>{live ? 'Company cash already paid. These subscribers are on the service now.' : 'Company cash already paid. These subscribers join the books the week the service turns on.'}</p>
                    <div className="stat-row">
                        <article><span>Reach</span><b>{formatPeople(reach)}</b></article>
                        <article><span>Buzz</span><b>{Math.round(buzz)}</b></article>
                        <article><span>New subscribers</span><b>{formatPeople(subs)}</b></article>
                    </div>
                    <div className="launch-kicker">By city</div>
                    {quote.cities.map(city => (
                        <div className="city-result" key={city.id}>
                            <span><b>{city.name}</b><small style={{ display: 'block', color: '#93a0bb' }}>{city.country}</small></span>
                            <span style={{ textAlign: 'right' }}>{formatPeople(city.reach)} reach<br />{formatPeople(city.subscribers)} subs · {flightMoney(city.cost)}</span>
                        </div>
                    ))}
                    <button type="button" className="launch-bar" onClick={onClose}><span><b>Back to the company</b><span>Flight total {flightMoney(quote.total)}</span></span><i>→</i></button>
                </div>
            )}
        </div>
    );
};
