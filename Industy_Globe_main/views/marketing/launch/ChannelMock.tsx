import React, { useEffect, useState } from 'react';
import type { PlatformBrand } from '../../../types';
import { brandAccent, typefaceById } from '../../../services/ownPlatform/brand';
import type { LaunchAnim } from '../../../services/marketing/launchCatalog';
import { BrandMark } from '../../ownPlatform/BrandMark';
import feed from './art/scene-feed.jpg';
import video from './art/scene-video.jpg';
import search from './art/scene-search.jpg';
import ctv from './art/scene-ctv.jpg';
import game from './art/scene-game.jpg';
import music from './art/scene-music.jpg';
import live from './art/scene-live.jpg';
import celeb from './art/scene-celeb.jpg';
import tv from './art/scene-tv.jpg';
import board from './art/scene-board.jpg';
import train from './art/scene-train.jpg';
import bus from './art/scene-bus.jpg';
import taxi from './art/scene-taxi.jpg';
import shelter from './art/scene-shelter.jpg';
import flyers from './art/scene-flyers.jpg';
import airport from './art/scene-airport.jpg';
import mall from './art/scene-mall.jpg';
import city from './art/scene-city.jpg';
import times from './art/scene-times.jpg';
import radio from './art/scene-radio.jpg';
import podcast from './art/scene-podcast.jpg';
import print from './art/scene-print.jpg';
import cinema from './art/scene-cinema.jpg';
import stadium from './art/scene-stadium.jpg';
import jersey from './art/scene-jersey.jpg';
import reveal from './art/scene-reveal.jpg';
import dubai from './art/sky-dubai.jpg';
import mumbai from './art/sky-mumbai.jpg';
import fest from './art/scene-fest.jpg';
import stunt from './art/scene-stunt.jpg';
import carpet from './art/scene-carpet.jpg';
import mob from './art/scene-mob.jpg';
import sky from './art/scene-sky.jpg';
import projection from './art/scene-projection.jpg';
import campus from './art/scene-campus.jpg';
import popup from './art/scene-popup.jpg';
import press from './art/scene-press.jpg';
import telecom from './art/scene-telecom.jpg';
import collab from './art/scene-collab.jpg';

const PHOTO: Record<LaunchAnim, string> = {
    feed, video, search, ctv, game, music, live, celeb, tv, board, train, bus, taxi, shelter, flyers,
    airport, mall, city, times, radio, podcast, print, cinema, stadium, jersey, reveal, light: dubai,
    drone: mumbai, fest, stunt, carpet, mob, sky, projection, campus, popup, press, telecom, collab,
};

/** Where the blank surface sits in each photograph, so the lockup lands on the medium. */
const SPOT: Record<LaunchAnim, { l: string; t: string; w: string }> = {
    feed: { l: '38%', t: '28%', w: '24%' },
    video: { l: '36%', t: '22%', w: '28%' },
    search: { l: '22%', t: '34%', w: '56%' },
    ctv: { l: '30%', t: '18%', w: '40%' },
    game: { l: '34%', t: '22%', w: '32%' },
    music: { l: '18%', t: '28%', w: '28%' },
    live: { l: '58%', t: '22%', w: '28%' },
    celeb: { l: '30%', t: '18%', w: '40%' },
    tv: { l: '28%', t: '16%', w: '44%' },
    board: { l: '24%', t: '20%', w: '34%' },
    train: { l: '22%', t: '34%', w: '34%' },
    bus: { l: '20%', t: '56%', w: '34%' },
    taxi: { l: '18%', t: '42%', w: '30%' },
    shelter: { l: '14%', t: '18%', w: '22%' },
    flyers: { l: '40%', t: '28%', w: '22%' },
    airport: { l: '30%', t: '16%', w: '40%' },
    mall: { l: '18%', t: '12%', w: '18%' },
    city: { l: '34%', t: '18%', w: '32%' },
    times: { l: '36%', t: '10%', w: '28%' },
    radio: { l: '36%', t: '40%', w: '28%' },
    podcast: { l: '58%', t: '28%', w: '28%' },
    print: { l: '22%', t: '28%', w: '34%' },
    cinema: { l: '30%', t: '16%', w: '40%' },
    stadium: { l: '18%', t: '62%', w: '46%' },
    jersey: { l: '36%', t: '28%', w: '28%' },
    reveal: { l: '38%', t: '8%', w: '24%' },
    light: { l: '42%', t: '18%', w: '16%' },
    drone: { l: '36%', t: '16%', w: '28%' },
    fest: { l: '30%', t: '22%', w: '40%' },
    stunt: { l: '28%', t: '16%', w: '44%' },
    carpet: { l: '28%', t: '14%', w: '44%' },
    mob: { l: '36%', t: '18%', w: '28%' },
    sky: { l: '40%', t: '22%', w: '20%' },
    projection: { l: '34%', t: '28%', w: '32%' },
    campus: { l: '30%', t: '22%', w: '40%' },
    popup: { l: '32%', t: '18%', w: '36%' },
    press: { l: '28%', t: '16%', w: '44%' },
    telecom: { l: '22%', t: '28%', w: '24%' },
    collab: { l: '22%', t: '32%', w: '26%' },
};

const SLIDE = new Set<LaunchAnim>(['train', 'bus', 'taxi']);
const FIT = new Set<LaunchAnim>(['board', 'bus']);
const CYCLE = new Set<LaunchAnim>(['ctv', 'tv', 'airport', 'mall', 'city', 'times', 'cinema', 'shelter']);
const CROWD = new Set<LaunchAnim>(['fest', 'stunt', 'mob', 'carpet', 'stadium']);

const labelFor = (name: string, script: boolean) => {
    const clean = name.trim() || 'Empire';
    const word = script ? clean : clean.toUpperCase();
    return word.endsWith('+') ? word : `${word}+`;
};

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

const Lock: React.FC<{ brand: PlatformBrand; name: string; size?: number }> = ({ brand, name, size = 18 }) => {
    const accent = brandAccent(brand);
    const face = typefaceById(brand.typefaceId);
    const label = labelFor(name, brand.typefaceId === 'script');
    return (
        <span className="lockspot-inner" style={{ color: accent, fontFamily: face.css }}>
            <BrandMark id={brand.markId} color={accent} size={size} letter={label} />
            <b style={{ fontFamily: face.css }}>{label}</b>
        </span>
    );
};

const Viewers: React.FC<{ reduce: boolean }> = ({ reduce }) => {
    const [count, setCount] = useState(24100);
    useEffect(() => {
        if (reduce) return undefined;
        const timer = window.setInterval(() => setCount(value => value + 13 + (value % 7)), 680);
        return () => window.clearInterval(timer);
    }, [reduce]);
    return <span className="live-badge">{(count / 1000).toFixed(1)}K watching</span>;
};

/** Illustrated place for one medium, with a looping motion and the live lockup on the surface. */
export const ChannelMock: React.FC<{ anim: LaunchAnim; brand: PlatformBrand; name: string }> = ({ anim, brand, name }) => {
    const spot = SPOT[anim];
    const reduce = useReduce();
    const frame = (
        <div className={FIT.has(anim) ? 'fit' : 'fill'}>
            <img src={PHOTO[anim]} alt="" />
            <span className={`lockspot ${anim === 'board' || anim === 'stadium' || anim === 'times' ? 'flicker' : ''}`} style={{ left: spot.l, top: spot.t, width: spot.w, height: FIT.has(anim) ? (anim === 'board' ? '34%' : '14%') : undefined }}>
                <Lock brand={brand} name={name} />
            </span>
        </div>
    );
    return (
        <div className={`scene ${reduce ? 'reduce' : ''}`} data-anim={anim}>
            {SLIDE.has(anim) ? <div className="mover">{frame}</div> : <div className="still">{frame}</div>}
            {CYCLE.has(anim) && (
                <div className="screen-win" style={{ left: spot.l, top: spot.t, width: spot.w, height: '42%' }}>
                    {[0, 1, 2].map(index => (
                        <div className="ad-slide" key={index}><Lock brand={brand} name={name} size={14} /></div>
                    ))}
                </div>
            )}
            {(anim === 'feed' || anim === 'live') && (
                <>
                    <i className="heart" style={{ right: '18%', top: '30%' }}>♥</i>
                    <i className="heart" style={{ right: '24%', top: '46%', animationDelay: '.5s' }}>♥</i>
                    <i className="heart" style={{ right: '12%', top: '40%', animationDelay: '1s' }}>♥</i>
                </>
            )}
            {anim === 'live' && <Viewers reduce={reduce} />}
            {anim === 'feed' && (
                <div className="mini-feed" style={{ left: spot.l, top: spot.t, width: spot.w }}>
                    {[0, 1, 2, 3, 4, 5].map(index => (
                        <div className="mini-post" key={index}><Lock brand={brand} name={name} size={10} /></div>
                    ))}
                </div>
            )}
            {anim === 'flyers' && (
                <>
                    <i className="flyer" style={{ left: '18%', top: '20%' }}><Lock brand={brand} name={name} size={10} /></i>
                    <i className="flyer" style={{ left: '46%', top: '12%', animationDelay: '.4s' }} />
                    <i className="flyer" style={{ left: '68%', top: '26%', animationDelay: '.8s' }} />
                </>
            )}
            {anim === 'video' || anim === 'tv' || anim === 'ctv' ? <div className="playbar"><i /></div> : null}
            {anim === 'search' && <i className="caret search-caret" />}
            {anim === 'music' && <i className="vinyl-dot" />}
            {anim === 'game' && <i className="runner" />}
            {CROWD.has(anim) && (
                <div className="crowd">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 0.08}s`, height: 10 + (index % 4) * 4 }} />)}</div>
            )}
            {anim === 'drone' && Array.from({ length: 14 }, (_, index) => (
                <i key={index} className="drone-dot" style={{ left: `${18 + (index % 7) * 9}%`, top: `${16 + Math.floor(index / 7) * 14}%`, animationDelay: `${index * 0.12}s` }} />
            ))}
            {anim === 'light' && <i className="beam beam-card" />}
            {anim === 'reveal' && <i className="banner banner-card"><Lock brand={brand} name={name} size={12} /></i>}
            {anim === 'stunt' && <i className="jump bike" />}
        </div>
    );
};
