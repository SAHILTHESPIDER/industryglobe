import React, { useEffect, useRef, useState } from 'react';
import type { PlatformBrand } from '../../../types';
import { brandAccent } from '../../../services/ownPlatform/brand';
import { formatPeople } from '../../../services/ownPlatform/logic';
import { flightMoney, landmarkFor, type FlightQuote } from '../../../services/marketing/launchCatalog';
import { LandmarkArt } from './Landmarks';
import { WorldMap } from './WorldMap';
import { Surface } from './Surfaces';
import type { LaunchAnim } from '../../../services/marketing/launchCatalog';
import './launch.css';

export interface NightStop {
    id: string;
    name: string;
    country: string;
    lat: number;
    lon: number;
    anim: string;
    event: string;
    title?: string;
}

const useReduce = () => {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const apply = () => setReduce(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);
    return reduce;
};

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

const GLYPH: Record<string, string[]> = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    '+': ['00100', '00100', '11111', '00100', '00100', '00000', '00000'],
};

/** Dot-matrix letters so the swarm resolves into a readable wordmark. */
const targetsFor = (label: string) => {
    const letters = label.toUpperCase().replace(/[^A-Z+]/g, '').slice(0, 8) || 'EMPIRE+';
    const cols = 5;
    const rows = 7;
    const gap = 1;
    const width = letters.length * (cols + gap);
    const points: { x: number; y: number }[] = [];
    letters.split('').forEach((letter, index) => {
        const glyph = GLYPH[letter] || GLYPH.E;
        glyph.forEach((row, y) => {
            row.split('').forEach((cell, x) => {
                if (cell !== '1') return;
                const px = (index * (cols + gap) + x + 0.5) / width;
                const py = (y + 0.5) / rows;
                for (let dy = -1; dy <= 1; dy += 1) {
                    for (let dx = -1; dx <= 1; dx += 1) {
                        points.push({ x: px + (dx * 0.28) / width, y: py + (dy * 0.28) / rows });
                    }
                }
            });
        });
    });
    return points;
};

const DroneField: React.FC<{ accent: string; label: string; reduce: boolean }> = ({ accent, label, reduce }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        const targets = targetsFor(label);
        const drones = targets.map(point => ({
            sx: Math.random(),
            sy: Math.random() * 0.72,
            tx: 0.22 + point.x * 0.56,
            ty: 0.1 + point.y * 0.28,
        }));
        let frame = 0;
        const started = performance.now();
        const paint = (now: number) => {
            const bounds = canvas.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, bounds.width * ratio);
            canvas.height = Math.max(1, bounds.height * ratio);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cycle = reduce ? 4.2 : ((now - started) / 1000) % 7.2;
            const formed = reduce ? 1 : cycle < 4.2 ? ease(cycle / 4.2) : cycle < 5.8 ? 1 : 1 - ease((cycle - 5.8) / 1.4);
            drones.forEach(drone => {
                const x = (drone.sx + (drone.tx - drone.sx) * formed) * canvas.width;
                const y = (drone.sy + (drone.ty - drone.sy) * formed) * canvas.height;
                ctx.fillStyle = accent;
                ctx.shadowColor = accent;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(x, y, (formed > 0.9 ? 3.1 : 1.8) * ratio, 0, Math.PI * 2);
                ctx.fill();
            });
            if (!reduce) frame = requestAnimationFrame(paint);
        };
        frame = requestAnimationFrame(paint);
        return () => cancelAnimationFrame(frame);
    }, [accent, label, reduce]);
    return <canvas ref={ref} className="drone-canvas" />;
};

const Fireworks: React.FC<{ reduce: boolean }> = ({ reduce }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || reduce) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        const sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
        let frame = 0;
        let last = 0;
        const burst = (width: number, height: number) => {
            const x = width * (0.25 + Math.random() * 0.5);
            const y = height * (0.12 + Math.random() * 0.28);
            const color = Math.random() > 0.5 ? '#E4B15A' : '#9ec5ff';
            for (let index = 0; index < 28; index += 1) {
                const angle = (index / 28) * Math.PI * 2;
                sparks.push({ x, y, vx: Math.cos(angle) * (1.2 + Math.random()), vy: Math.sin(angle) * (1.2 + Math.random()), life: 1, color });
            }
        };
        const paint = (now: number) => {
            const bounds = canvas.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, bounds.width * ratio);
            canvas.height = Math.max(1, bounds.height * ratio);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (now - last > 900) {
                burst(canvas.width, canvas.height);
                last = now;
            }
            sparks.forEach(spark => {
                spark.x += spark.vx * ratio;
                spark.y += spark.vy * ratio;
                spark.vy += 0.02 * ratio;
                spark.life -= 0.012;
                ctx.globalAlpha = Math.max(0, spark.life);
                ctx.fillStyle = spark.color;
                ctx.fillRect(spark.x, spark.y, 2.2 * ratio, 2.2 * ratio);
            });
            ctx.globalAlpha = 1;
            for (let index = sparks.length - 1; index >= 0; index -= 1) if (sparks[index].life <= 0) sparks.splice(index, 1);
            frame = requestAnimationFrame(paint);
        };
        frame = requestAnimationFrame(paint);
        return () => cancelAnimationFrame(frame);
    }, [reduce]);
    return <canvas ref={ref} className="fx-canvas" />;
};

const Crowd = () => (
    <div className="crowd crowd-wide">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ animationDelay: `${(index % 8) * 0.07}s`, height: 12 + (index % 5) * 5 }} />)}</div>
);

const Scene: React.FC<{ anim: string; cityId: string; city: string; service: string; brand: PlatformBrand; event: string; title?: string; reduce: boolean }> = ({ anim, cityId, city, service, brand, event, title, reduce }) => {
    const accent = brandAccent(brand);
    const word = (service.trim() || 'EMPIRE').toUpperCase();
    const label = word.endsWith('+') ? word : `${word}+`;
    const place = landmarkFor(cityId, anim);
    const onLandmark = anim === 'reveal' || anim === 'light' || anim === 'projection' || anim === 'drone';
    return (
        <>
        <div className="night-sky" data-scene={anim} data-landmark={place.kind}>
            {onLandmark
                ? <LandmarkArt kind={place.kind} brand={brand} label={label} title={title} />
                : <Surface anim={(anim || 'fest') as LaunchAnim} brand={brand} name={service} title={title} />}
            {(anim === 'reveal' || anim === 'stunt' || anim === 'fest' || anim === 'light') && <Fireworks reduce={reduce} />}
            {anim === 'drone' && <DroneField accent={accent} label={label} reduce={reduce} />}
            {Array.from({ length: 10 }, (_, index) => <i key={index} className="confetti" style={{ left: `${(index * 19) % 100}%`, animationDelay: `${index * 0.18}s`, background: index % 2 ? accent : '#E4B15A' }} />)}
        </div>
        <div className="night-caption">
            <div className="night-name">
                <span>{event}{title ? ` · ${title}` : ''}</span>
                <b>{city}</b>
                <small>{place.name}</small>
            </div>
            <Crowd />
        </div>
        </>
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
            const t = Math.min(1, (now - start) / 1600);
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
    hold?: 'drone' | 'reveal' | 'light' | 'fest' | 'stunt' | 'results';
    onClose: () => void;
}> = ({ stops, brand, service, quote, live, hold, onClose }) => {
    const reduce = useReduce();
    const sequence = stops.length ? stops : [{ id: 'bom', name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88, anim: hold === 'reveal' ? 'reveal' : 'drone', event: hold === 'reveal' ? 'Building reveal' : 'Drone show', title: '' }];
    const [index, setIndex] = useState(0);
    const showResults = hold === 'results' || index >= sequence.length;
    useEffect(() => {
        if (hold || showResults) return undefined;
        const timer = window.setTimeout(() => setIndex(value => value + 1), reduce ? 1200 : 7000);
        return () => window.clearTimeout(timer);
    }, [index, hold, showResults, reduce]);
    const stop = sequence[Math.min(index, sequence.length - 1)];
    const reach = useTick(quote.reach, showResults && !reduce);
    const buzz = useTick(quote.buzz, showResults && !reduce);
    const subs = useTick(quote.subscribers, showResults && !reduce);
    const held = hold && hold !== 'results' ? hold : '';
    const scene = held || stop.anim;
    const eventName: Record<string, string> = { drone: 'Drone show', reveal: 'Building reveal', light: 'Landmark light show', fest: 'Fan festival', stunt: 'Live stunt show' };
    const event = held ? eventName[held] : stop.event;
    return (
        <div className={`night ${reduce ? 'reduce' : ''}`} data-screen={showResults ? 'launch-results' : 'launch-night'} data-scene={showResults ? 'results' : scene}>
            {!showResults && (
                <>
                    <button type="button" className="skip" onClick={() => setIndex(sequence.length)}>Skip to results</button>
                    <Scene anim={scene} cityId={stop.id} city={stop.name} service={service} brand={brand} event={event} title={stop.title} reduce={reduce} />
                    <WorldMap className="night-map" pins={sequence.map(item => ({ ...item, lit: true }))} activeId={stop.id} />
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
