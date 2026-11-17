import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { CampaignScene } from '../../../services/marketing/sceneRegistry';
import { BrandMark } from '../../ownPlatform/BrandMark';

const GLYPH: Record<string, string[]> = {
    A: ['01110', '10001', '11111', '10001', '10001'],
    E: ['11111', '10000', '11110', '10000', '11111'],
    H: ['10001', '10001', '11111', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '11111'],
    O: ['01110', '10001', '10001', '10001', '01110'],
    R: ['11110', '10001', '11110', '10100', '10001'],
    S: ['01111', '10000', '01110', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100'],
    W: ['10001', '10001', '10101', '11011', '10001'],
};

const targetsFor = (label: string) => {
    const letters = label.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'TITLE';
    const points: { x: number; y: number }[] = [];
    const cols = 5;
    const rows = 5;
    const width = letters.length * (cols + 1);
    letters.split('').forEach((letter, index) => {
        (GLYPH[letter] || GLYPH.E).forEach((row, y) => {
            row.split('').forEach((cell, x) => {
                if (cell === '1') points.push({ x: (index * (cols + 1) + x + 0.5) / width, y: (y + 0.5) / rows });
            });
        });
    });
    return points;
};

const Drones: React.FC<{ label: string; reduce: boolean; accent: string }> = ({ label, reduce, accent }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        const targets = targetsFor(label);
        const drones = targets.map(point => ({
            sx: Math.random(),
            sy: Math.random() * 0.7,
            tx: 0.18 + point.x * 0.64,
            ty: 0.16 + point.y * 0.34,
        }));
        let frame = 0;
        const started = performance.now();
        const paint = (now: number) => {
            const bounds = canvas.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, bounds.width * ratio);
            canvas.height = Math.max(1, bounds.height * ratio);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const formed = reduce ? 1 : Math.min(1, (now - started) / 2800);
            drones.forEach(drone => {
                const x = (drone.sx + (drone.tx - drone.sx) * formed) * canvas.width;
                const y = (drone.sy + (drone.ty - drone.sy) * formed) * canvas.height;
                ctx.fillStyle = accent;
                ctx.shadowColor = accent;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(x, y, 2.2 * ratio, 0, Math.PI * 2);
                ctx.fill();
            });
            if (!reduce && formed < 1) frame = requestAnimationFrame(paint);
        };
        frame = requestAnimationFrame(paint);
        return () => cancelAnimationFrame(frame);
    }, [label, reduce, accent]);
    return <canvas ref={ref} className="drone-canvas" />;
};

const Art: React.FC<{ title: string; poster?: string; frame: string; accent: string; markId?: string; letter: string; customMark?: string }> = ({ title, poster, frame, accent, markId, letter, customMark }) => (
    <div className={`art ${frame === '1:9' ? 'ratio-tall' : ''}`} style={{ background: `linear-gradient(160deg, #120c08, ${accent} 42%, #0c0c10)` }}>
        {poster ? <img src={poster} alt="" /> : (
            <>
                {customMark ? <img src={customMark} alt="" width={28} height={28} /> : markId ? <BrandMark id={markId} color="#fff" size={frame === '1:9' ? 18 : 28} letter={letter} /> : null}
                <b>{title}</b>
            </>
        )}
    </div>
);

const Blocks: React.FC<{ count: number; skyline: string }> = ({ count }) => (
    <div className="skyline" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
            <i key={index} style={{ left: `${index * (100 / count)}%`, width: `${86 / count}%`, height: `${28 + ((index * 37) % 70)}%` }} />
        ))}
    </div>
);

export const SceneStage: React.FC<{ scene: CampaignScene; title: string; poster?: string; replayKey?: number; accent?: string; markId?: string; letter?: string; customMark?: string }> = ({ scene, title, poster, replayKey = 0, accent = '#E4B15A', markId, letter = 'S', customMark }) => {
    const reduce = useReducedMotion();
    const word = (title || 'TITLE').toUpperCase();
    const quad = scene.quad;
    const surfaceStyle: React.CSSProperties = {
        left: `${quad.x}%`,
        top: `${quad.y}%`,
        width: `${quad.w}%`,
        height: `${quad.h}%`,
        transform: `perspective(700px) rotateY(${quad.rotateY}deg) skewX(${quad.skew}deg)`,
        aspectRatio: scene.frame === '1:9' ? '1 / 9' : scene.frame === '3:1' ? '3 / 1' : scene.frame === '3:4' ? '3 / 4' : '16 / 9',
    };
    return (
        <div className="stage" data-effect={scene.effect} data-city={scene.cityId} key={replayKey}>
            <div className={`sky ${scene.skyline}`} />
            {scene.backdrop ? <div className="scene-photo" style={{ backgroundImage: `url(${scene.backdrop})` }} /> : null}
            <Blocks count={scene.skyline === 'canyon' ? 14 : 10} skyline={scene.skyline} />
            {scene.effect === 'led' && (
                <div className="led-tower" style={{ left: `${quad.x - 4}%`, boxShadow: `inset 0 0 24px ${accent}` }}>
                    {!reduce && <i className="led-scan" style={{ background: `linear-gradient(transparent, ${accent}, transparent)` }} />}
                </div>
            )}
            {scene.effect === 'billboard' && <i className="lamps" style={{ left: `${quad.x}%`, width: `${quad.w}%` }} />}
            {scene.effect === 'stunt' && (
                <>
                    <i className="ramp" />
                    {!reduce && <i className="streak" />}
                </>
            )}
            {scene.effect === 'festival' && (
                <div className="crowd" aria-hidden="true">
                    {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ height: `${40 + (index % 5) * 12}%` }} />)}
                </div>
            )}
            {scene.effect === 'screen' && (
                <div aria-hidden="true">
                    {[0, 1, 2].map(index => (
                        <i key={index} className={`win ${index === 1 ? 'on' : ''}`} style={{ left: `${18 + index * 22}%`, top: `${24 + (index % 2) * 8}%`, width: '16%', height: '18%' }} />
                    ))}
                </div>
            )}
            {scene.effect === 'drone' && <Drones label={word} reduce={Boolean(reduce)} accent={accent} />}
            <div className={`surface ${scene.effect === 'banner' && !reduce ? 'banner-drop' : ''} ${scene.frame === '1:9' ? 'ratio-1-9' : ''}`} style={surfaceStyle}>
                {scene.effect === 'billboard' && <i className="placeholder" />}
                <Art title={word} poster={poster} frame={scene.frame} accent={accent} markId={markId} letter={letter} customMark={customMark} />
            </div>
            <div className="ground" />
        </div>
    );
};
