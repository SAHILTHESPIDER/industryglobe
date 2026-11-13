import React, { useMemo } from 'react';
import { COUNTRY_SEEDS } from '../../../services/ownPlatform/countrySeeds';
import { WORLD_MAP_HEIGHT, WORLD_MAP_WIDTH, WORLD_PATHS, projectMarket } from '../../../services/ownPlatform/worldPaths';

interface Box { x: number; y: number; w: number; h: number }

const boundsFor = (ids: string[]): Box => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const add = (x: number, y: number) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    };
    ids.forEach(id => {
        const path = WORLD_PATHS[id];
        if (path) {
            const matcher = /(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g;
            let match = matcher.exec(path);
            while (match) {
                add(Number(match[1]), Number(match[2]));
                match = matcher.exec(path);
            }
            return;
        }
        const seed = COUNTRY_SEEDS.find(row => row[0] === id);
        if (!seed) return;
        const point = projectMarket(seed[8], seed[9]);
        add(point.x, point.y);
    });
    if (!Number.isFinite(minX)) return { x: 0, y: 0, w: WORLD_MAP_WIDTH, h: WORLD_MAP_HEIGHT };
    const padX = Math.max(16, (maxX - minX) * 0.14);
    const padY = Math.max(16, (maxY - minY) * 0.18);
    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const right = Math.min(WORLD_MAP_WIDTH, maxX + padX);
    const bottom = Math.min(WORLD_MAP_HEIGHT, maxY + padY);
    return { x, y, w: Math.max(48, right - x), h: Math.max(48, bottom - y) };
};

interface Props {
    ids: string[];
    accent: string;
    glow?: boolean;
    label: string;
}

export const RegionMap: React.FC<Props> = ({ ids, accent, glow, label }) => {
    const idKey = ids.join(',');
    const box = useMemo(() => boundsFor(ids), [idKey]);
    const on = useMemo(() => new Set(ids), [idKey]);
    const dots = useMemo(() => ids.flatMap(id => {
        if (WORLD_PATHS[id]) return [];
        const seed = COUNTRY_SEEDS.find(row => row[0] === id);
        if (!seed) return [];
        const point = projectMarket(seed[8], seed[9]);
        return [{ id, ...point }];
    }), [idKey]);
    const filterId = `loc-glow-${ids[0] || 'map'}-${glow ? 'g' : 'f'}`;
    return (
        <div className={`loc-map${glow ? ' glow' : ''}`} aria-hidden={false}>
            <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label={label}>
                <defs>
                    <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <radialGradient id={`${filterId}-sea`} cx="50%" cy="40%" r="70%">
                        <stop offset="0%" stopColor="#12304a" />
                        <stop offset="100%" stopColor="#071018" />
                    </radialGradient>
                </defs>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${filterId}-sea)`} />
                {Object.entries(WORLD_PATHS).map(([id, path]) => {
                    const hot = on.has(id);
                    return (
                        <path
                            key={id}
                            d={path}
                            data-on={hot ? '1' : '0'}
                            fill={hot ? accent : '#1a3148'}
                            stroke={hot ? '#fff6' : '#071018'}
                            strokeWidth={hot ? 0.8 : 0.35}
                            filter={hot ? `url(#${filterId})` : undefined}
                        />
                    );
                })}
                {dots.map(dot => (
                    <circle key={dot.id} data-on="1" cx={dot.x} cy={dot.y} r={3.2} fill={accent} stroke="#fff" strokeWidth={0.6} />
                ))}
            </svg>
        </div>
    );
};
