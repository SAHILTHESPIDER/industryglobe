import React from 'react';

interface Props {
    id: string;
    color?: string;
    size?: number;
    letter?: string;
}

/** The thirteen service marks. Kept as strokes so they still read at app-icon size. */
export const BrandMark: React.FC<Props> = ({ id, color = '#F5C16C', size = 28, letter = 'E' }) => {
    const common = { width: size, height: size, viewBox: '0 0 32 32', 'aria-hidden': true as const };
    const stroke = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (id) {
        case 'bolt':
            return <svg {...common}><path d="M18 3 7 18h8l-2 11 12-16h-8z" fill={color} /></svg>;
        case 'aperture':
            return (
                <svg {...common}>
                    <circle cx="16" cy="16" r="10" {...stroke} />
                    <path d="M16 6l4 8-4 2-4-2zM8.5 20.5 16 16l2 4-6 3zM23.5 20.5 16 16l-2 4 6 3z" {...stroke} />
                </svg>
            );
        case 'ring':
            return <svg {...common}><circle cx="16" cy="16" r="9" {...stroke} /><circle cx="16" cy="16" r="3" fill={color} /></svg>;
        case 'slash':
            return <svg {...common}><path d="M8 26 24 6" {...stroke} strokeWidth="3" /><path d="M6 8h8M18 24h8" {...stroke} /></svg>;
        case 'letter':
            return (
                <svg {...common}>
                    <rect x="4" y="4" width="24" height="24" rx="6" {...stroke} />
                    <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="800" fill={color} fontFamily="Outfit, sans-serif">{letter.slice(0, 1).toUpperCase()}</text>
                </svg>
            );
        case 'wave':
            return <svg {...common}><path d="M3 18c4-7 6-7 9 0s5 7 9 0 5-7 8 0" {...stroke} /></svg>;
        case 'diamond':
            return <svg {...common}><path d="M16 4 28 16 16 28 4 16z" {...stroke} /></svg>;
        case 'orbit':
            return <svg {...common}><circle cx="16" cy="16" r="4" {...stroke} /><ellipse cx="16" cy="16" rx="12" ry="5" {...stroke} transform="rotate(-28 16 16)" /></svg>;
        case 'ticket':
            return <svg {...common}><path d="M5 9h22v5a3 3 0 0 0 0 4v5H5v-5a3 3 0 0 0 0-4z" {...stroke} /><path d="M16 10v12" {...stroke} strokeDasharray="2 2" /></svg>;
        case 'star':
            return <svg {...common}><path d="m16 4 3 8h8l-6.5 5 2.5 8L16 20l-7 5 2.5-8L5 12h8z" fill={color} /></svg>;
        case 'frame':
            return <svg {...common}><rect x="5" y="7" width="22" height="16" rx="2" {...stroke} /><path d="M5 23h22" {...stroke} /></svg>;
        case 'bars':
            return <svg {...common}><path d="M7 22V12M16 22V6M25 22v-7" {...stroke} strokeWidth="3" /></svg>;
        case 'play':
            return <svg {...common}><path d="M11 7v18l14-9z" fill={color} /></svg>;
        case 'crown':
            return <svg {...common}><path d="M6 22 9 10l7 6 7-6 3 12z" {...stroke} /><path d="M8 25h16" {...stroke} /></svg>;
        case 'flame':
            return <svg {...common}><path d="M16 4c2 5-2 7-1 11 3-2 7 1 7 6a6 6 0 0 1-12 0c0-3 2-5 3-8 0 3 2 4 3 2-1-3 0-7 0-11z" fill={color} /></svg>;
        case 'globe':
        default:
            return (
                <svg {...common}>
                    <circle cx="16" cy="13" r="8" {...stroke} />
                    <ellipse cx="16" cy="13" rx="3.2" ry="8" {...stroke} />
                    <path d="M8 13h16" {...stroke} />
                    <rect x="4" y="22" width="24" height="6" rx="1.5" {...stroke} />
                    <path d="M7 25h2M12 25h2M17 25h2M22 25h2" stroke={color} strokeWidth="1.6" />
                </svg>
            );
    }
};
