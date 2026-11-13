import React, { useEffect, useMemo, useState } from 'react';
import type { PlatformBrand, Player } from '../../../types';
import { brandAccent, brandFrom, typefaceById } from '../../../services/ownPlatform/brand';
import { readCompanyCash } from '../../../services/ownPlatform/companyCash';
import { formatCompact } from '../../../services/ownPlatform/logic';
import { listMarketingTitles } from '../../../services/marketing/engine';
import { confirmLaunchFlight, quoteLaunchFlight, type LaunchDraft } from '../../../services/marketing/launch';
import { KEY_ARTS, LAUNCH_GROUPS, NIGHT_ORDER, TAGLINES, TRAILER_CUTS, campaignCity, citiesByRegion, flightMoney, launchChannel } from '../../../services/marketing/launchCatalog';
import { ChannelMock } from './ChannelMock';
import { LaunchNight, type NightStop } from './LaunchNight';
import { WorldMap } from './WorldMap';
import '../../ownPlatform/fonts';
import './launch.css';

const STEPS = ['What', 'Where', 'How', 'Creative', 'Budget', 'Review'] as const;

interface Props {
    player: Player;
    onPlayer: (player: Player) => void;
    onClose: () => void;
    initialStep?: number;
    initialCities?: string[];
    initialChannels?: string[];
    scene?: 'drone' | 'reveal' | 'light' | 'fest' | 'stunt' | 'results';
}

const brandLabel = (name: string, script: boolean) => {
    const clean = name.trim() || 'Empire';
    const word = script ? clean : clean.toUpperCase();
    return word.endsWith('+') ? word : `${word}+`;
};

export const LaunchCampaign: React.FC<Props> = ({
    player, onPlayer, onClose, initialStep = 0, initialCities = [], initialChannels = [], scene,
}) => {
    const state = player.ownPlatform;
    const brand: PlatformBrand = brandFrom(state?.brand);
    const service = state?.name?.trim() || 'Empire+';
    const script = brand.typefaceId === 'script';
    const [step, setStep] = useState(initialStep);
    const [what, setWhat] = useState<'PLATFORM' | 'TITLE'>('PLATFORM');
    const [titleId, setTitleId] = useState('');
    const [cities, setCities] = useState<string[]>(initialCities);
    const [channels, setChannels] = useState<string[]>(initialChannels);
    const [art, setArt] = useState('night');
    const [trailer, setTrailer] = useState('open');
    const [tagline, setTagline] = useState(TAGLINES[0]);
    const [weeks, setWeeks] = useState(4);
    const [ratio, setRatio] = useState(1);
    const [weights, setWeights] = useState<Record<string, number>>({});
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [night, setNight] = useState(Boolean(scene));
    const titles = useMemo(() => (state ? listMarketingTitles(player, 'EMPIRE', 'empire') : []), [player, state]);
    const title = titles.find(row => row.id === (titleId || titles[0]?.id));
    const draft: LaunchDraft = {
        what,
        titleId: what === 'TITLE' ? title?.id : undefined,
        titleName: what === 'TITLE' ? title?.name : service,
        cityIds: cities,
        channelIds: channels,
        creativeId: art,
        trailerId: trailer,
        tagline,
        weeks,
        ratio,
        weights,
    };
    const quote = useMemo(() => quoteLaunchFlight(player, draft), [player, what, titleId, cities.join(','), channels.join(','), art, trailer, tagline, weeks, ratio, JSON.stringify(weights), service, title?.id, title?.name]);
    const picked = quote.channels.filter(row => channels.includes(row.id) && !row.disabled);
    const cash = readCompanyCash(player);
    const live = state?.stage === 'LIVE';

    useEffect(() => {
        const section = new URLSearchParams(window.location.search).get('section');
        const node = section ? document.getElementById(`launch-${section}`) : null;
        node?.scrollIntoView({ block: 'start' });
    }, [step]);

    if (!state) return null;
    const shown = brandLabel(service, script);

    const stops: NightStop[] = cities.flatMap((id, index) => {
        const city = campaignCity(id);
        if (!city) return [];
        const nights = NIGHT_ORDER.filter(channelId => channels.includes(channelId) && !quote.channels.find(row => row.id === channelId)?.disabled);
        const eventId = nights.length ? nights[index % nights.length] : 'social_feed';
        const row = launchChannel(eventId);
        return [{
            id: city.id,
            name: city.name,
            country: quote.cities.find(item => item.id === city.id)?.country || city.countryId,
            lat: city.lat,
            lon: city.lon,
            anim: row?.anim || 'drone',
            event: nights.length ? (row?.name || 'Drone show') : 'Campaign live',
        }];
    });

    const launch = () => {
        const result = confirmLaunchFlight(player, draft);
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        onPlayer(result.player);
        setNight(true);
    };

    const goNext = () => {
        if (step === 1 && !cities.length) { setError('Pick at least one city.'); return; }
        if (step === 2 && !picked.length) { setError('Pick a channel that can run in these cities.'); return; }
        setError('');
        if (step < 5) setStep(step + 1);
        else launch();
    };

    if (night) {
        return (
            <div className="launch" data-screen="launch-campaign">
                <LaunchNight stops={stops} brand={brand} service={shown} quote={quote} live={live} hold={scene === 'results' ? 'results' : scene} onClose={onClose} />
            </div>
        );
    }

    const nextLabel = ['Where', 'How', 'Creative', 'Budget', 'Review', 'Launch'][step];
    const rateWeek = picked.reduce((sum, row) => sum + row.weekly, 0);
    const barDetail = step === 2
        ? `${picked.length} picked · ${flightMoney(rateWeek)} a week`
        : step >= 4
            ? `${flightMoney(quote.weekly)} a week · ${flightMoney(quote.opening)} opening · ${weeks} weeks`
            : `${cities.length} cities · company cash ${formatCompact(cash)}`;

    return (
        <div className="launch" data-screen="launch-campaign" data-step={step + 1}>
            <header className="launch-top">
                <button type="button" className="launch-back" aria-label="Back" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>←</button>
                <div style={{ minWidth: 0 }}>
                    <h1>LAUNCH CAMPAIGN</h1>
                    <div className="launch-kicker">Step {step + 1} of 6 · {live ? 'On air' : 'Before opening'}</div>
                </div>
                <div className="launch-cash"><span>Company cash</span><b>{formatCompact(cash)}</b></div>
            </header>
            <div className="launch-steps">
                {STEPS.map((label, index) => (
                    <button key={label} type="button" className={index < step ? 'done' : index === step ? 'now' : ''} onClick={() => index <= step && setStep(index)}>
                        <i>{index < step ? '✓' : index + 1}</i>
                        <span>{label}</span>
                    </button>
                ))}
            </div>
            <div className="launch-scroll">
                {step === 0 && (
                    <div className="what-grid">
                        <button type="button" className={`pick ${what === 'PLATFORM' ? 'on' : ''}`} onClick={() => setWhat('PLATFORM')}>
                            <div className="key-art"><ChannelMock anim="ctv" brand={brand} name={service} /></div>
                            <b>Open {shown}</b>
                            <span>The service itself, before the first subscriber.</span>
                        </button>
                        {titles.map(row => (
                            <button key={row.id} type="button" className={`pick ${what === 'TITLE' && title?.id === row.id ? 'on' : ''}`} onClick={() => { setWhat('TITLE'); setTitleId(row.id); }}>
                                <b>{row.name}</b>
                                <span>{row.statusLine} · {row.genre}</span>
                            </button>
                        ))}
                    </div>
                )}
                {step === 1 && (
                    <>
                        <p style={{ color: '#b7c3da', maxWidth: 760 }}>Every channel is bought in each city you tick. Outdoor screens, billboards, metro, mall and city screens, and opening night are a separate booking per city. The cost index is the one the network already uses.</p>
                        <WorldMap
                            className="map world-map"
                            activeId={cities[cities.length - 1]}
                            pins={citiesByRegion().flatMap(region => region.cities).map(city => ({ id: city.id, lat: city.lat, lon: city.lon, lit: cities.includes(city.id) }))}
                        />
                        <div className="city-tools">
                            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Mumbai, Dubai, New York…" aria-label="Search cities" />
                        </div>
                        {citiesByRegion().map(region => {
                            const rows = region.cities.filter(city => !query.trim() || `${city.name} ${city.district}`.toLowerCase().includes(query.trim().toLowerCase()));
                            if (!rows.length) return null;
                            const ids = rows.map(city => city.id);
                            return (
                                <div key={region.id} id={`launch-${region.id}`}>
                                    <div className="launch-sec">
                                        <h2>{region.name}</h2>
                                        <button type="button" className="region-all" onClick={() => {
                                            const allOn = ids.every(id => cities.includes(id));
                                            setCities(current => allOn ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])]);
                                        }}>All in {region.short}</button>
                                    </div>
                                    <div className="city-wrap">
                                        {rows.map(city => (
                                            <button key={city.id} type="button" className={`city-chip ${cities.includes(city.id) ? 'on' : ''}`} onClick={() => setCities(current => current.includes(city.id) ? current.filter(id => id !== city.id) : [...current, city.id])}>
                                                <b>{city.name}</b>
                                                <small>{city.district} · {city.costIndex.toFixed(2)}×</small>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
                {step === 2 && LAUNCH_GROUPS.map(group => (
                    <section key={group.id} id={`launch-${group.id}`}>
                        <div className="launch-sec"><h2>{group.name}</h2><p>{group.line}</p></div>
                        <div className="launch-grid">
                            {quote.channels.filter(row => row.group === group.id).map(row => {
                                const on = channels.includes(row.id) && !row.disabled;
                                return (
                                    <button key={row.id} type="button" className={`ch ${on ? 'on' : ''}`} disabled={row.disabled} data-channel={row.id} onClick={() => {
                                        if (row.disabled) return;
                                        setChannels(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id]);
                                    }}>
                                        <div className="ch-art">
                                            <ChannelMock anim={row.anim} brand={brand} name={service} />
                                            {on && <span className="tick">✓</span>}
                                        </div>
                                        <h3>{row.name}</h3>
                                        {!row.disabled && row.place && <div className="where">{row.place}</div>}
                                        {!row.disabled && <div className="blurb">{row.blurb}</div>}
                                        {row.disabled && <div className="ch-note">{row.reason}</div>}
                                        {!row.disabled && <b className="price">{row.opening ? `Opening night · ${flightMoney(row.opening)}` : `${flightMoney(row.weekly)} a week`}</b>}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
                {step === 3 && (
                    <>
                        <div className="launch-sec"><h2>Key art</h2><p>The lockup stays the one on the company.</p></div>
                        <div className="creative-grid">
                            {KEY_ARTS.map(row => (
                                <button key={row.id} type="button" className={`pick ${art === row.id ? 'on' : ''}`} onClick={() => setArt(row.id)}>
                                    <div className="key-art" style={{ background: row.id === 'gold' ? 'linear-gradient(160deg,#3c2a12,#0c0b10)' : '#070b14', color: brandAccent(brand), fontFamily: typefaceById(brand.typefaceId).css, fontWeight: 800, fontSize: row.id === 'type' ? 28 : 18, display: 'grid', placeItems: 'center' }}>{shown}</div>
                                    <b>{row.name}</b><span>{row.line}</span>
                                </button>
                            ))}
                        </div>
                        <div className="launch-sec"><h2>Trailer cut</h2></div>
                        <div className="creative-grid">
                            {TRAILER_CUTS.map(row => (
                                <button key={row.id} type="button" className={`pick ${trailer === row.id ? 'on' : ''}`} onClick={() => setTrailer(row.id)}><b>{row.name}</b><span>{row.line}</span></button>
                            ))}
                        </div>
                        <div className="launch-sec"><h2>Tagline</h2></div>
                        <div className="city-wrap">
                            {TAGLINES.map(line => <button key={line} type="button" className={`city-chip ${tagline === line ? 'on' : ''}`} onClick={() => setTagline(line)}>{line}</button>)}
                        </div>
                        <input className="tag-input" style={{ marginTop: 10 }} value={tagline} onChange={event => setTagline(event.target.value.slice(0, 90))} aria-label="Tagline" />
                    </>
                )}
                {step === 4 && (
                    <div className="budget">
                        <label><span>Weekly budget {flightMoney(quote.weekly)} of the rate card</span><input type="range" min={35} max={100} value={Math.round(ratio * 100)} onChange={event => setRatio(Number(event.target.value) / 100)} /></label>
                        <label><span>Weeks {weeks}</span><input type="range" min={1} max={8} value={weeks} onChange={event => setWeeks(Number(event.target.value))} /></label>
                        <div className="launch-kicker">Channel split</div>
                        {picked.filter(row => row.weekly > 0).map(row => (
                            <label key={row.id} className="split">
                                <span>{row.name}</span>
                                <b>{flightMoney(row.spend)}</b>
                                <input type="range" min={1} max={100} value={weights[row.id] || 50} onChange={event => setWeights(current => ({ ...current, [row.id]: Number(event.target.value) }))} style={{ gridColumn: '1 / -1' }} />
                            </label>
                        ))}
                        <p style={{ color: '#b7c3da' }}>Opening night stays on the rate card. Personal cash is not used. Company cash has {formatCompact(cash)}.</p>
                        {quote.notes.map(note => <p key={note} style={{ color: '#E4B15A', margin: 0 }}>{note}</p>)}
                    </div>
                )}
                {step === 5 && (
                    <div className="paper">
                        <div className="stamp-mark">BOOKED</div>
                        <h2>Launch order</h2>
                        <p style={{ color: '#d9d0c2' }}>{draft.titleName} · {tagline}</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
                            {picked.map(row => <li key={row.id}><span>{row.name}</span><b>{row.opening ? flightMoney(row.opening) : `${flightMoney(row.spend)} × ${weeks}`}</b></li>)}
                            <li><span>Cities</span><b>{quote.cities.map(city => city.name).join(', ')}</b></li>
                            <li><span>Company cash after</span><b>{formatCompact(Math.max(0, cash - quote.total))}</b></li>
                            <li><span>Personal cash</span><b>unchanged</b></li>
                        </ul>
                        <p style={{ color: '#b7c3da' }}>Reach {quote.reach.toLocaleString('en-US')} · buzz {quote.buzz} · new subscribers {quote.subscribers.toLocaleString('en-US')}.</p>
                    </div>
                )}
            </div>
            {error && <div className="launch-error">{error}</div>}
            <button type="button" className="launch-bar" data-testid="launch-next" onClick={goNext} disabled={step === 5 && cash < quote.total}>
                <span><b>{step === 5 ? 'Launch' : `Next: ${nextLabel}`}</b><span>{barDetail}</span></span>
                <i>→</i>
            </button>
        </div>
    );
};
