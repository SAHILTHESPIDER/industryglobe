import React, { useMemo } from 'react';
import { COUNTRY_SEEDS } from '../../services/ownPlatform/countrySeeds';
import { getCountry } from '../../services/ownPlatform/catalog';
import { WORLD_MAP_HEIGHT, WORLD_MAP_WIDTH, WORLD_PATHS, projectMarket } from '../../services/ownPlatform/worldPaths';

interface Props {
    selectedIds: string[];
    focusId?: string;
    regionId?: string;
    onPick: (countryId: string) => void;
}

const PATHS = Object.entries(WORLD_PATHS);

export const WorldMarketMap: React.FC<Props> = ({ selectedIds, focusId, regionId, onPick }) => {
    const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
    const dots = useMemo(
        () => COUNTRY_SEEDS.filter(seed => !WORLD_PATHS[seed[0]]).map(seed => {
            const point = projectMarket(seed[8], seed[9]);
            return { id: seed[0], name: seed[1], ...point };
        }),
        [],
    );
    const focus = focusId ? getCountry(focusId) : undefined;
    const focusPoint = focus ? projectMarket(
        COUNTRY_SEEDS.find(seed => seed[0] === focus.id)?.[8] ?? 0,
        COUNTRY_SEEDS.find(seed => seed[0] === focus.id)?.[9] ?? 0,
    ) : null;

    const fillFor = (id: string, countryRegion: string | undefined) => {
        if (selected.has(id)) return '#6d5efc';
        if (regionId && countryRegion === regionId) return '#3c4d73';
        return '#2a3348';
    };

    return (
        <div data-testid="world-market-map" className="rounded-3xl border border-white/10 bg-[#070b16] p-2">
            <svg viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`} className="w-full h-auto" role="img" aria-label="World map of launch markets">
                <rect width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} fill="#070b16" />
                {PATHS.map(([id, d]) => {
                    const country = getCountry(id);
                    if (!country) return null;
                    const focused = id === focusId;
                    return (
                        <path
                            key={id}
                            d={d}
                            data-country={id}
                            fill={fillFor(id, country.regionId)}
                            stroke={focused ? '#ffffff' : selected.has(id) ? '#c4b5fd' : '#0b1020'}
                            strokeWidth={focused ? 3 : 1.2}
                            className="cursor-pointer"
                            onClick={() => onPick(id)}
                        >
                            <title>{country.flag} {country.name}</title>
                        </path>
                    );
                })}
                {dots.map(dot => {
                    const country = getCountry(dot.id);
                    if (!country) return null;
                    const focused = dot.id === focusId;
                    return (
                        <circle
                            key={dot.id}
                            data-country={dot.id}
                            cx={dot.x}
                            cy={dot.y}
                            r={focused ? 7 : 5.5}
                            fill={fillFor(dot.id, country.regionId)}
                            stroke={focused || selected.has(dot.id) ? '#ffffff' : '#94a3b8'}
                            strokeWidth={1.4}
                            className="cursor-pointer"
                            onClick={() => onPick(dot.id)}
                        >
                            <title>{country.flag} {country.name}</title>
                        </circle>
                    );
                })}
                {focus && focusPoint && (
                    <text x={Math.min(WORLD_MAP_WIDTH - 8, focusPoint.x + 8)} y={Math.max(14, focusPoint.y - 8)} fill="#ffffff" fontSize="14" fontWeight="700">
                        {focus.name}
                    </text>
                )}
            </svg>
            <div className="flex flex-wrap gap-3 px-2 pb-1 text-[11px] text-zinc-400">
                <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#6d5efc' }} />On the slate</span>
                <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#3c4d73' }} />This region</span>
                <span>Click a country to add or remove it. Dots are markets too small for the coastline.</span>
            </div>
        </div>
    );
};
