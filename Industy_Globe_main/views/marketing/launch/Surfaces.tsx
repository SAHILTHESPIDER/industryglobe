import React from 'react';
import type { PlatformBrand } from '../../../types';
import type { LandmarkKind, LaunchAnim } from '../../../services/marketing/launchCatalog';
import { brandAccent, typefaceById } from '../../../services/ownPlatform/brand';
import { BrandMark } from '../../ownPlatform/BrandMark';
import { LandmarkArt } from './Landmarks';
import './surfaces.css';

export interface ArtProps {
    brand: PlatformBrand;
    label: string;
    title?: string;
    font: string;
}

const labelFor = (name: string, script: boolean) => {
    const clean = name.trim() || 'Empire';
    const word = script ? clean : clean.toUpperCase();
    return word.endsWith('+') ? word : `${word}+`;
};

/** Key art that fills whatever surface it is clipped or stretched into. */
export const Poster: React.FC<ArtProps & { line?: string; strip?: boolean }> = ({ brand, label, title, font, line = 'Now streaming', strip }) => {
    const accent = brandAccent(brand);
    const headline = title || label;
    return (
        <div className={`poster ${strip ? 'strip' : ''}`} style={{ ['--ink' as string]: accent, fontFamily: font }}>
            <div className="poster-key"><i /></div>
            {!strip && (
                <div className="poster-mark">
                    <BrandMark id={brand.markId} color="#fff" size={22} letter={label} />
                    <span>{label}</span>
                </div>
            )}
            <div className="poster-copy">
                <b>{headline}</b>
                {!strip && <span>{title ? label : line}</span>}
            </div>
            <i className="poster-sweep" />
        </div>
    );
};

const Phone: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="phone"><i className="island" /><div className="phone-screen">{children}</div></div>
);

const Feed = (p: ArtProps) => (
    <div className="place" style={{ background: '#0e1016' }}>
        <Phone>
            <div className="feed-post a"><Poster {...p} line="Sponsored" /></div>
            <div className="feed-post b"><Poster {...p} strip /></div>
            <i className="heart-pop">♥</i>
        </Phone>
    </div>
);

const Video = (p: ArtProps) => (
    <div className="place" style={{ background: '#05060a' }}>
        <Phone>
            <div className="video-screen" style={{ position: 'absolute', inset: 0 }}>
                <Poster {...p} line="Tap to watch" />
                <div className="playbar"><i /></div>
            </div>
        </Phone>
    </div>
);

const Search = (p: ArtProps) => (
    <div className="place search-scene">
        <div className="search-bar"><b>{p.label}</b> streaming<i /></div>
        <div className="search-hit"><Poster {...p} line="Official" /></div>
    </div>
);

const Tv = (p: ArtProps) => (
    <div className="place room" style={{ ['--glow' as string]: brandAccent(p.brand) }}>
        <div className="tv"><Poster {...p} line="Tonight" /></div>
        <div className="tv-stand" />
    </div>
);

const Game = (p: ArtProps) => (
    <div className="place game-scene" style={{ ['--glow' as string]: brandAccent(p.brand) }}>
        <div className="game-board"><Poster {...p} /></div>
        <div className="game-hud"><Poster {...p} strip /></div>
    </div>
);

const Music = (p: ArtProps) => (
    <div className="place player" style={{ ['--glow' as string]: brandAccent(p.brand) }}>
        <div className="album"><Poster {...p} line="Now playing" /></div>
        <div className="player-meta" style={{ fontFamily: p.font }}><b>{p.title || p.label}</b></div>
        <div className="eq-live">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}</div>
    </div>
);

const Live = (p: ArtProps) => (
    <div className="place live-scene">
        <Poster {...p} line="Live now" />
        <b className="live-pill">LIVE</b>
        <div className="lower" style={{ fontFamily: p.font }}>
            <BrandMark id={p.brand.markId} color="#fff" size={22} letter={p.label} />
            <span>{p.label}</span>
        </div>
    </div>
);

const Celeb = (p: ArtProps) => (
    <div className="place celeb">
        <div className="celeb-hero"><Poster {...p} line="With" /></div>
        <i className="celeb-figure" />
    </div>
);

const Board = (p: ArtProps) => (
    <div className="place billboard">
        {Array.from({ length: 9 }, (_, i) => <i key={i} className="bb-block" style={{ left: `${i * 11}%`, height: `${18 + (i % 3) * 8}%` }} />)}
        <div className="bb-face"><div className="bb-roll"><Poster {...p} line="This Friday" /></div></div>
        <i className="bb-cat" /><i className="bb-pole" />
        <i className="bb-spot l" /><i className="bb-spot r" />
    </div>
);

const Metro = (p: ArtProps) => (
    <div className="place metro">
        <div className="metro-ceil">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
        <div className="metro-psd">{Array.from({ length: 6 }, (_, i) => <div className="psd" key={i}><Poster {...p} strip /></div>)}</div>
        <div className="metro-train">
            <Poster {...p} line="The whole line" />
            <div className="metro-stripe" style={{ fontFamily: p.font }}>
                {Array.from({ length: 5 }, (_, i) => (
                    <span key={i}><BrandMark id={p.brand.markId} color="#fff" size={14} letter={p.label} />{p.label}</span>
                ))}
            </div>
            <div className="metro-doors">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>
            {[22, 46, 70, 94].map(left => <i key={left} className="metro-seam" style={{ left: `${left}%` }} />)}
        </div>
        <div className="metro-floor" />
    </div>
);

const Bus = (p: ArtProps) => (
    <div className="place bus-scene" style={{ ['--glow' as string]: brandAccent(p.brand) }}>
        <div className="skyline">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ height: 30 + (i % 5) * 16 }} />)}{Array.from({ length: 18 }, (_, i) => <i key={`b${i}`} style={{ height: 30 + (i % 5) * 16 }} />)}</div>
        <div className="coach">
            <div className="coach-body">
                <Poster {...p} line="Citywide" />
                <div className="coach-glass">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>
                <i className="coach-lamp" />
            </div>
            <i className="coach-wheel a" /><i className="coach-wheel b" />
        </div>
        <div className="road"><i /></div>
    </div>
);

const Taxi = (p: ArtProps) => (
    <div className="place taxi-scene">
        <div className="skyline near">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ height: 24 + (i % 4) * 14 }} />)}</div>
        <div className="auto">
            <div className="auto-roof" style={{ fontFamily: p.font, background: brandAccent(p.brand) }}>{p.label}</div>
            <div className="auto-body"><Poster {...p} line="Hail it" /></div>
            <i className="auto-glass" />
            <i className="coach-wheel a" /><i className="coach-wheel b" />
        </div>
        <div className="road"><i /></div>
    </div>
);

const Shelter = (p: ArtProps) => (
    <div className="place shelter">
        <div className="shelter-frame"><Poster {...p} /></div>
        <div className="shelter-frame b"><Poster {...p} strip /></div>
        <div className="pavement" />
    </div>
);

const Flyers = (p: ArtProps) => (
    <div className="place flyer-scene">
        <div className="handbill a"><Poster {...p} /></div>
        <div className="handbill b"><Poster {...p} strip /></div>
        <div className="handbill c"><Poster {...p} /></div>
    </div>
);

const Airport = (p: ArtProps) => (
    <div className="place terminal">
        <div className="terminal-ceil" />
        <div className="screens">
            <div className="panel"><Poster {...p} strip /></div>
            <div className="panel"><Poster {...p} line="Departures" /></div>
            <div className="panel"><Poster {...p} strip /></div>
        </div>
        <div className="pavement" />
    </div>
);

const Mall = (p: ArtProps) => (
    <div className="place mall">
        <div className="mall-banner a"><Poster {...p} /></div>
        <div className="mall-banner b"><Poster {...p} line="Atrium" /></div>
        <div className="mall-banner c"><Poster {...p} /></div>
        <div className="escalator" />
    </div>
);

const City = (p: ArtProps) => (
    <div className="place tower-led" style={{ ['--glow' as string]: brandAccent(p.brand) }}>
        <div className="tower"><Poster {...p} line="Lower Parel" /></div>
        <div className="tower b"><Poster {...p} strip /></div>
        <div className="street-glow" />
    </div>
);

const Times = (p: ArtProps) => (
    <div className="place square">
        <div className="stack">
            <div className="row"><Poster {...p} strip /></div>
            <div className="row big"><Poster {...p} /></div>
            <div className="row"><Poster {...p} strip /></div>
            <div className="row"><Poster {...p} strip /></div>
        </div>
    </div>
);

const Radio = (p: ArtProps) => (
    <div className="place booth">
        <div className="monitor"><Poster {...p} line="On air" /></div>
        <i className="mic" />
    </div>
);

const Podcast = (p: ArtProps) => (
    <div className="place pod-scene" style={{ ['--glow' as string]: brandAccent(p.brand) }}>
        <div className="cover"><Poster {...p} line="Listen" /></div>
        <div className="eq">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.07}s`, height: `${30 + (i % 4) * 16}%` }} />)}</div>
    </div>
);

const Print = (p: ArtProps) => (
    <div className="place" style={{ background: '#1a140e' }}>
        <div className="news-sheet">
            <div className="mast">THE EVENING CITY</div>
            <div className="news-ad"><Poster {...p} line="Full page" /></div>
        </div>
    </div>
);

const Cinema = (p: ArtProps) => (
    <div className="place cinema">
        <div className="cinema-screen"><Poster {...p} line="Now showing" /></div>
        <div className="cinema-beam" />
        <div className="seats" />
    </div>
);

const Stadium = (p: ArtProps) => (
    <div className="place bowl">
        <div className="stands" />
        <div className="ribbon"><Poster {...p} line="Full time" /></div>
        <div className="pitch" />
    </div>
);

const Jersey = (p: ArtProps) => (
    <div className="place kit">
        <div className="shirt"><Poster {...p} line="Matchday" /></div>
    </div>
);

const Fest = (p: ArtProps) => (
    <div className="place fest-scene">
        <div className="truss" />
        <div className="backdrop"><Poster {...p} line="Tonight" /></div>
        <div className="fest-crowd">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s`, height: `${50 + (i % 4) * 12}%` }} />)}</div>
    </div>
);

const Stunt = (p: ArtProps) => (
    <div className="place arena" style={{ ['--glow' as string]: brandAccent(p.brand) }}>
        <div className="banner-ring">{Array.from({ length: 4 }, (_, i) => <div className="panel" key={i}><Poster {...p} strip /></div>)}</div>
        <div className="ramp" />
        <i className="bike-jump" style={{ background: brandAccent(p.brand) }} />
    </div>
);

const Carpet = (p: ArtProps) => (
    <div className="place stepwall">
        <div className="repeat" style={{ fontFamily: p.font, color: brandAccent(p.brand) }}>
            {Array.from({ length: 9 }, (_, i) => (
                <div className="cell" key={i}>
                    <BrandMark id={p.brand.markId} color="#fff" size={20} letter={p.label} />
                    <b style={{ color: '#fff' }}>{p.label}</b>
                </div>
            ))}
        </div>
        <div className="rope" />
    </div>
);

const Mob = (p: ArtProps) => (
    <div className="place mob-scene">
        <div className="board-hold" style={{ left: '8%' }}><Poster {...p} /></div>
        <div className="board-hold" style={{ left: '36%', animationDelay: '.2s' }}><Poster {...p} strip /></div>
        <div className="board-hold" style={{ left: '60%', animationDelay: '.4s' }}><Poster {...p} /></div>
        <i className="person" style={{ left: '14%' }} /><i className="person" style={{ left: '44%' }} /><i className="person" style={{ left: '70%' }} />
    </div>
);

const Sky = (p: ArtProps) => (
    <div className="place skywrite" style={{ ['--glow' as string]: brandAccent(p.brand), fontFamily: p.font }}>
        <div className="vapor">{p.title || p.label}</div>
    </div>
);

const Campus = (p: ArtProps) => (
    <div className="place quad">
        <div className="hall"><div className="hall-banner"><Poster {...p} line="Campus" /></div></div>
    </div>
);

const Popup = (p: ArtProps) => (
    <div className="place shop">
        <div className="awning" style={{ background: brandAccent(p.brand), fontFamily: p.font }}>{p.label}</div>
        <div className="window"><Poster {...p} line="Open late" /></div>
    </div>
);

const Press = (p: ArtProps) => (
    <div className="place" style={{ background: '#0c1018' }}>
        <div className="press-wall">{Array.from({ length: 8 }, (_, i) => <div className="cell" key={i}><Poster {...p} strip /></div>)}</div>
        <div className="mics">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div>
    </div>
);

const Telecom = (p: ArtProps) => (
    <div className="place" style={{ background: '#14120e' }}>
        <div className="store-wall">{Array.from({ length: 6 }, (_, i) => <div className="handset" key={i}><Poster {...p} strip={i % 2 === 1} /></div>)}</div>
    </div>
);

const Collab = (p: ArtProps) => (
    <div className="place collab">
        <div className="half"><Poster {...p} /></div>
        <div className="half"><Poster {...p} strip /></div>
        <b className="vs">×</b>
    </div>
);

const LANDMARK_CARD: Partial<Record<LaunchAnim, LandmarkKind>> = {
    light: 'burj',
    reveal: 'eiffel',
    projection: 'empire',
    drone: 'sealink',
};

const SCENES: Record<Exclude<LaunchAnim, 'light' | 'reveal' | 'projection' | 'drone'>, (props: ArtProps) => React.ReactNode> = {
    feed: Feed, video: Video, search: Search, ctv: Tv, game: Game, music: Music, live: Live, celeb: Celeb, tv: Tv,
    board: Board, train: Metro, bus: Bus, taxi: Taxi, shelter: Shelter, flyers: Flyers, airport: Airport, mall: Mall,
    city: City, times: Times, radio: Radio, podcast: Podcast, print: Print, cinema: Cinema, stadium: Stadium, jersey: Jersey,
    fest: Fest, stunt: Stunt, carpet: Carpet, mob: Mob, sky: Sky, campus: Campus, popup: Popup, press: Press, telecom: Telecom, collab: Collab,
};

/** One illustrated place. The brand art is the screen, wrap, page, or stage. */
export const Surface: React.FC<{ anim: LaunchAnim; brand: PlatformBrand; name: string; title?: string }> = ({ anim, brand, name, title }) => {
    const font = typefaceById(brand.typefaceId).css;
    const label = labelFor(name, brand.typefaceId === 'script');
    const props: ArtProps = { brand, label, title, font };
    const kind = LANDMARK_CARD[anim];
    if (kind) return <LandmarkArt kind={kind} brand={brand} label={label} title={title} />;
    const draw = SCENES[anim as keyof typeof SCENES] || Board;
    return <>{draw(props)}</>;
};
