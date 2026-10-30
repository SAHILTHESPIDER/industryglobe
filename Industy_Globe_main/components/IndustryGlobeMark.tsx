import React from 'react';

interface Props {
    size?: number;
    /** Filled tile for app icon, splash, and favicon. Bare mark sits on an existing dark surface. */
    tile?: boolean;
    title?: string;
    className?: string;
}

/** Original Industry Globe mark: a globe crossed by a film strip. */
export const IndustryGlobeMark: React.FC<Props> = ({ size = 32, tile = true, title = 'Industry Globe', className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={title}
        className={className}
    >
        {tile && <rect width="64" height="64" rx="14" fill="#070B16" />}
        <g fill="none" stroke="#F5C16C" strokeWidth="2.2">
            <circle cx="32" cy="28" r="15" />
            <ellipse cx="32" cy="28" rx="6.5" ry="15" />
            <path d="M17 28h30" strokeWidth="1.6" />
        </g>
        <path d="M19 22.2c8 2 18 2 26 0" fill="none" stroke="#8B7BFF" strokeWidth="1.4" />
        <path d="M19 33.8c8-2 18-2 26 0" fill="none" stroke="#8B7BFF" strokeWidth="1.4" />
        <rect x="7" y="42" width="50" height="14" rx="3" fill="#14100A" stroke="#F5C16C" strokeWidth="1.4" />
        <g fill="#F5C16C">
            <rect x="11" y="45" width="5" height="8" rx="1" />
            <rect x="20" y="45" width="5" height="8" rx="1" />
            <rect x="29" y="45" width="5" height="8" rx="1" />
            <rect x="38" y="45" width="5" height="8" rx="1" />
            <rect x="47" y="45" width="5" height="8" rx="1" />
        </g>
    </svg>
);
