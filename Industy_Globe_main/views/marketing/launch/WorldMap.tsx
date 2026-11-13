import React from 'react';
import worldUrl from './art/world.svg';

export interface MapPin {
    id: string;
    lat: number;
    lon: number;
    lit?: boolean;
}

/** Equirectangular land, same projection as the pins, so a city sits on its real coast. */
export const WorldMap: React.FC<{ pins: MapPin[]; activeId?: string; className?: string }> = ({ pins, activeId, className }) => (
    <div className={className || 'world-map'} aria-hidden="true">
        <img src={worldUrl} alt="" />
        <svg viewBox="0 0 1000 500" className="pin-layer">
            {pins.map(pin => {
                const x = ((pin.lon + 180) / 360) * 1000;
                const y = ((90 - pin.lat) / 180) * 500;
                const on = pin.id === activeId || pin.lit;
                return (
                    <g key={pin.id}>
                        {on && <circle className="pin-pulse" cx={x} cy={y} r={pin.id === activeId ? 16 : 11} />}
                        <circle cx={x} cy={y} r={on ? 4.2 : 2.2} fill={on ? '#9ec5ff' : '#8aa0c4'} />
                    </g>
                );
            })}
        </svg>
    </div>
);
