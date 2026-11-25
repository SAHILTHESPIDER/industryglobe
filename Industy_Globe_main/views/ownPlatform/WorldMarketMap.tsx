import React, { useMemo } from 'react';
import { COUNTRY_SEEDS } from '../../services/ownPlatform/countrySeeds';
import { getCountry } from '../../services/ownPlatform/catalog';
import { WORLD_MAP_HEIGHT, WORLD_MAP_WIDTH, WORLD_PATHS, projectMarket } from '../../services/ownPlatform/worldPaths';
import { paintedWorldPaths } from '../../services/ownPlatform/worldMapPaint';

export interface MapMarker {
    id: string;
    lat: number;
    lon: number;
    kind: 'server' | 'hq' | 'office';
    title: string;
    tone?: 'ok' | 'warn' | 'bad' | 'idle';
}

interface Props {
    selectedIds: string[];
    focusId?: string;
    regionId?: string;
    onPick: (countryId: string) => void;
    markers?: MapMarker[];
    onMarker?: (id: string) => void;
    legend?: string;
    /** When set, a country can wear its own licence colour. Selection stays on the stroke. */
    fillId?: (countryId: string) => string | undefined;
}

/** Largest first, so an enclave painted later sits above the country around it. */
const PATHS = paintedWorldPaths();

const toneFill = (tone: MapMarker['tone']) => {
    if (tone === 'ok') return '#3DFFA0';
    if (tone === 'warn') return '#FFC44D';
    if (tone === 'bad') return '#FF5470';
    return '#C4B5FD';
};

export const WorldMarketMap: React.FC<Props> = ({ selectedIds, focusId, regionId, onPick, markers = [], onMarker, legend, fillId }) => {
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
                {PATHS.map(({ id, d, holed }) => {
                    const country = getCountry(id);
                    if (!country) return null;
                    const focused = id === focusId;
                    return (
                        <path
                            key={id}
                            d={d}
                            data-country={id}
                            fill={fillId?.(id) || fillFor(id, country.regionId)}
                            fillRule={holed ? 'evenodd' : 'nonzero'}
                            stroke={focused ? '#ffffff' : selected.has(id) ? '#c4b5fd' : '#0b1020'}
                            strokeWidth={focused ? 2.2 : 0.8}
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
                            fill={fillId?.(dot.id) || fillFor(dot.id, country.regionId)}
                            stroke={focused || selected.has(dot.id) ? '#ffffff' : '#94a3b8'}
                            strokeWidth={1.4}
                            className="cursor-pointer"
                            onClick={() => onPick(dot.id)}
                        >
                            <title>{country.flag} {country.name}</title>
                        </circle>
                    );
                })}
                {markers.map(marker => {
                    const point = projectMarket(marker.lat, marker.lon);
                    const fill = toneFill(marker.tone);
                    return (
                        <g
                            key={`${marker.kind}-${marker.id}`}
                            data-marker={marker.id}
                            transform={`translate(${point.x} ${point.y})`}
                            className="cursor-pointer"
                            onClick={(event) => { event.stopPropagation(); onMarker?.(marker.id); }}
                        >
                            <title>{marker.title}</title>
                            {marker.kind === 'hq' && (
                                <polygon points="0,-9 2.6,-2.8 9,-2.8 3.8,1.2 5.6,8 0,4 -5.6,8 -3.8,1.2 -9,-2.8 -2.6,-2.8" fill="#FFC44D" stroke="#fff" strokeWidth="0.6" />
                            )}
                            {marker.kind === 'office' && (
                                <g>
                                    <rect x="-4.5" y="-2" width="9" height="7" fill="#8B7BFF" stroke="#fff" strokeWidth="0.5" />
                                    <polygon points="-6,-2 0,-7 6,-2" fill="#E7E5FF" />
                                </g>
                            )}
                            {marker.kind === 'server' && <circle r="4.2" fill={fill} stroke="#fff" strokeWidth="0.7" />}
                        </g>
                    );
                })}
                {focus && focusPoint && (
                    <text
                        x={focusPoint.x > WORLD_MAP_WIDTH - 140 ? Math.max(8, focusPoint.x - 10) : Math.min(WORLD_MAP_WIDTH - 8, focusPoint.x + 10)}
                        y={Math.max(18, focusPoint.y - 10)}
                        fill="#ffffff"
                        fontSize="18"
                        fontWeight="700"
                        textAnchor={focusPoint.x > WORLD_MAP_WIDTH - 140 ? 'end' : 'start'}
                        stroke="#070b16"
                        strokeWidth="4"
                        paintOrder="stroke"
                        style={{ pointerEvents: 'none' }}
                    >
                        {focus.name}
                    </text>
                )}
            </svg>
            <div className="flex flex-wrap gap-3 px-2 pb-1 text-[11px] text-zinc-400">
                <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#6d5efc' }} />On the slate</span>
                {fillId && (
                    <>
                        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#1f8f62' }} />Licensed</span>
                        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#c6a15a' }} />In review</span>
                        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#c4842a' }} />Conditions</span>
                        <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#a33b52' }} />Refused</span>
                    </>
                )}
                <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#3c4d73' }} />This region</span>
                <span>{legend || 'Click a country to add or remove it. Dots are markets too small for the coastline.'}</span>
                {markers.length > 0 && (
                    <>
                        <span>Star is headquarters.</span>
                        <span>Building is a country office.</span>
                        <span>Dot is a server room.</span>
                    </>
                )}
            </div>
        </div>
    );
};
