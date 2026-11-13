import React from 'react';

const frame = (sky: string, children: React.ReactNode) => (
    <svg viewBox="0 0 320 180" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="320" height="180" fill={sky} />
        {children}
    </svg>
);

export const SoonArt: React.FC<{ id: string }> = ({ id }) => {
    if (id === 'kids') return frame('#7BE3FF', <><path d="M0 120c40-30 80-10 120-28s70-10 110 8 60 10 90-12v92H0z" fill="#3DDC84" /><circle cx="250" cy="42" r="18" fill="#F6C445" /><circle cx="70" cy="108" r="16" fill="#FF8BD2" /><circle cx="150" cy="96" r="10" fill="#7C5CFF" /></>);
    if (id === 'games') return frame('#1B1030', <><rect x="0" y="120" width="320" height="60" fill="#24143f" /><rect x="40" y="78" width="70" height="16" rx="6" fill="#3DFFA0" /><rect x="150" y="96" width="90" height="16" rx="6" fill="#8B7BFF" /><rect x="250" y="40" width="36" height="80" rx="8" fill="#FF5A7A" /></>);
    if (id === 'interactive') return frame('#0C1224', <><rect x="36" y="36" width="248" height="108" rx="12" fill="#101828" stroke="#3D7EFF" /><rect x="70" y="90" width="80" height="26" rx="8" fill="#3D7EFF" /><rect x="164" y="90" width="70" height="26" rx="8" fill="#E4B15A" /></>);
    if (id === 'shorts') return frame('#241433', <><rect x="118" y="16" width="84" height="148" rx="16" fill="#16122a" stroke="#FF7AD9" /><polygon points="150,70 150,118 186,94" fill="#fff" /></>);
    if (id === 'podcasts') return frame('#07140f', <><rect x="40" y="100" width="16" height="40" rx="4" fill="#8B7BFF" /><rect x="70" y="70" width="16" height="70" rx="4" fill="#3D7EFF" /><rect x="100" y="50" width="16" height="90" rx="4" fill="#3DFFA0" /><circle cx="230" cy="90" r="36" fill="#123" stroke="#3DFFA0" strokeWidth="8" /></>);
    if (id === 'music') return frame('#101018', <><circle cx="120" cy="96" r="46" fill="#111" stroke="#3DFFA0" strokeWidth="8" /><circle cx="120" cy="96" r="8" fill="#3DFFA0" /><rect x="200" y="40" width="10" height="70" fill="#E4B15A" /><circle cx="214" cy="112" r="16" fill="#E4B15A" /></>);
    if (id === 'fan') return frame('#2A1444', <><rect x="70" y="36" width="180" height="108" rx="16" fill="#5B2A86" /><circle cx="110" cy="110" r="8" fill="#FF7AD9" /><circle cx="134" cy="110" r="8" fill="#F6C445" /><circle cx="158" cy="110" r="8" fill="#3D7EFF" /></>);
    if (id === 'premieres') return frame('#1a0a12', <><path d="M160 20 L210 150 H110 Z" fill="#E11D48" /><rect x="90" y="28" width="140" height="22" fill="#F6C445" /></>);
    if (id === 'merch') return frame('#24180a', <><path d="M70 50h40l10 14h80l10-14h40l-16 90H86z" fill="#F6C445" /><rect x="200" y="40" width="70" height="90" rx="6" fill="#E4B15A" /></>);
    if (id === 'fanfest') return frame('#12081c', <><polygon points="40,150 160,40 280,150" fill="#102038" /><rect x="70" y="78" width="180" height="72" fill="#3D7EFF" /></>);
    if (id === 'tours') return frame('#87b7e8', <><rect x="30" y="70" width="70" height="70" fill="#d8d2c4" /><rect x="120" y="50" width="80" height="90" fill="#f2efe6" /><rect x="220" y="80" width="70" height="60" fill="#c4b89a" /><rect x="40" y="140" width="250" height="16" fill="#3a4658" /></>);
    return frame('#241446', <><circle cx="200" cy="70" r="46" fill="#3D7EFF" /><path d="M0 130c40-20 80 10 120-8s80 10 120-16 50 8 80-10v84H0z" fill="#142038" /><circle cx="70" cy="40" r="6" fill="#F6C445" /></>);
};

export const SOON_SHOWS = [
    { id: 'kids', name: 'Kids', line: 'A safe, bright app just for kids' },
    { id: 'games', name: 'Games', line: 'Play inside the worlds of your shows' },
    { id: 'interactive', name: 'Interactive', line: 'Viewers choose what happens next' },
    { id: 'shorts', name: 'Shorts', line: 'Quick vertical clips from your shows' },
    { id: 'podcasts', name: 'Podcasts', line: 'The stories behind your hits' },
    { id: 'music', name: 'Music', line: 'Soundtracks and songs from your shows' },
];

export const SOON_EARN = [
    { id: 'fan', name: 'Fan Club', line: 'Members get extras and early news' },
    { id: 'premieres', name: 'Premieres', line: 'Pay once to watch a new hit first' },
    { id: 'merch', name: 'Merch Shop', line: 'Tees, posters and toys of your hits' },
    { id: 'fanfest', name: 'Fan Festival', line: 'A yearly fan event with stars and reveals' },
    { id: 'tours', name: 'Studio Tours', line: 'Fans walk through your sets' },
    { id: 'world', name: 'World', line: 'A theme park built from your shows' },
];
