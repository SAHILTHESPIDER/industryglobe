import React, { useEffect, useMemo, useState } from 'react';
import type { MarketingActionId, MarketingAudience, MarketingCreative, MarketingDateStyle, MarketingEmphasis, MarketingSocialFormat, MarketingTarget, Player } from '../../types';
import '../ownPlatform/fonts';
import './marketing.css';
import {
    AUDIENCES,
    DATE_STYLES,
    EMPHASIS,
    LAYOUTS,
    MARKETING_ACTIONS,
    MARKETING_CATEGORIES,
    PALETTES,
    SIZES,
    SOCIAL_FORMATS,
    STAGE_THEMES,
    confirmMarketing,
    defaultCreative,
    defaultTarget,
    formatCount,
    formatMoney,
    listMarketingTitles,
    marketingStops,
    quoteMarketing,
    wakeMarketing,
} from '../../services/marketing/engine';
import { hashString } from '../../services/marketing/core';
import { LAUNCH_REGIONS, MARKET_COUNTRIES, REGION_CITIES } from '../../services/ownPlatform/catalog';
import { FrameCard, PosterThumb, WireCard } from './art';
import { Surface } from './launch/Surfaces';
import { CampaignGrid } from './run/CampaignGrid';
import type { LaunchAnim } from '../../services/marketing/launchCatalog';
import { DEFAULT_BRAND } from '../../services/ownPlatform/brand';

type Tab = 'build' | 'calendar' | 'history' | 'frame' | 'wire';

interface Props {
    player: Player;
    ownerKind: 'EMPIRE' | 'HOUSE';
    ownerId: string;
    ownerName: string;
    cash: number;
    initialTitleId?: string;
    initialActionId?: MarketingActionId;
    initialTab?: Tab;
    onPlayer: (player: Player) => void;
    onBack: () => void;
    onLaunch?: () => void;
}

const ACTION_SCENE: Record<string, LaunchAnim> = {
    billboard: 'board', digital_screen: 'city', transit: 'train', standee: 'cinema',
    city_tour: 'taxi', fan_meet: 'fest', college: 'campus', mall: 'mall',
    announcement: 'press', teaser: 'video', trailer: 'cinema', music: 'music', premiere: 'carpet',
    reels: 'feed', influencer: 'live', paid_ads: 'search', bts: 'video',
    interview: 'podcast', presser: 'press', tv_spot: 'tv', podcast: 'podcast',
    tieup: 'collab', merch: 'jersey', contest: 'mob', giveaway: 'flyers',
};

const draftKey = (ownerId: string, titleId: string, actionId: string, creative: MarketingCreative, target: MarketingTarget) => (
    hashString(JSON.stringify({ ownerId, titleId, actionId, creative, target })).toString(16)
);

export const MarketingDesk: React.FC<Props> = ({
    player, ownerKind, ownerId, ownerName, cash, initialTitleId, initialActionId, initialTab, onPlayer, onBack, onLaunch,
}) => {
    const [tab, setTab] = useState<Tab>(initialTab || 'build');
    const [titleId, setTitleId] = useState(initialTitleId || '');
    const [actionId, setActionId] = useState<string>(initialActionId || 'billboard');
    const [category, setCategory] = useState<string>(MARKETING_ACTIONS.find(row => row.id === (initialActionId || 'billboard'))?.category || 'OUTDOOR');
    const [creative, setCreative] = useState<MarketingCreative>(defaultCreative());
    const [target, setTarget] = useState<MarketingTarget>(defaultTarget());
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'OURS' | 'RIVALS'>('ALL');
    const [running, setRunning] = useState(false);

    useEffect(() => {
        const next = wakeMarketing(player);
        if (next !== player) onPlayer(next);
    }, [player, onPlayer]);

    const titles = useMemo(() => listMarketingTitles(player, ownerKind, ownerId), [player, ownerKind, ownerId]);
    useEffect(() => {
        if (!titleId && titles[0]) setTitleId(titles[0].id);
    }, [titleId, titles]);

    const countries = MARKET_COUNTRIES.filter(country => target.regionId === 'WORLD' || country.regionId === target.regionId);
    const regionForCities = target.regionId === 'WORLD'
        ? countries.find(country => country.id === target.countryId)?.regionId
        : target.regionId;
    const cities = regionForCities && regionForCities !== 'WORLD' ? REGION_CITIES[regionForCities as keyof typeof REGION_CITIES] || [] : [];
    const languages = countries.find(country => country.id === target.countryId)?.languages.map(language => language.name) || [];

    const key = draftKey(ownerId, titleId, actionId, creative, target);
    const draft = {
        key,
        ownerKind,
        ownerId,
        ownerName,
        titleId,
        actionId,
        creative: { ...creative, languageVariant: target.language || creative.languageVariant },
        target,
    };
    const quoted = titleId ? quoteMarketing(player, draft) : { error: titles.length ? 'Pick a title.' : 'Greenlight or license a title before you buy a campaign.' };
    const poster = quoted.poster;
    const stops = marketingStops(draft);
    const action = MARKETING_ACTIONS.find(row => row.id === actionId);
    const scene = action?.category === 'TOUR' ? 'tour' : action?.category === 'STAGE' || action?.category === 'PRESS' ? 'stage' : action?.category === 'DIGITAL' ? 'frame' : 'board';

    const desk = player.marketing;
    const ourCampaigns = (desk?.campaigns || []).filter(campaign => campaign.ownerKind === ownerKind && campaign.ownerId === ownerId);
    const posts = (desk?.posts || []).filter(post => {
        if (filter === 'OURS') return !post.rival && post.ownerName === ownerName;
        if (filter === 'RIVALS') return post.rival;
        return true;
    });
    const trends = Array.from(new Set(posts.map(post => `#${post.titleName.replace(/\s+/g, '')}`))).slice(0, 6);

    const buy = () => {
        const result = confirmMarketing(player, draft);
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        setConfirming(false);
        onPlayer(result.player);
        setTab(action?.category === 'PRESS' ? 'wire' : 'frame');
    };

    const setRegion = (regionId: string) => {
        const nextCountries = MARKET_COUNTRIES.filter(country => regionId === 'WORLD' || country.regionId === regionId);
        const country = nextCountries[0];
        const cityRegion = regionId === 'WORLD' ? country?.regionId : regionId;
        const city = cityRegion ? (REGION_CITIES[cityRegion as keyof typeof REGION_CITIES] || [])[0] : undefined;
        setTarget(current => ({
            ...current,
            regionId,
            countryId: country?.id,
            cityId: city?.id,
            language: country?.languages[0]?.name || current.language,
        }));
    };

    return (
        <div className="mkt" data-screen="marketing-desk" data-owner={ownerKind}>
            {running && (
                <CampaignGrid
                    player={player}
                    ownerKind={ownerKind === 'EMPIRE' ? 'EMPIRE' : 'HOUSE'}
                    ownerId={ownerId}
                    titleId={titleId || undefined}
                    onPlayer={onPlayer}
                    onClose={() => setRunning(false)}
                />
            )}
            <header className="mkt-top">
                <div>
                    <button type="button" className="mkt-back" onClick={onBack}>Back</button>
                    {onLaunch && <button type="button" className="mkt-launch" data-testid="open-launch-campaign" onClick={onLaunch}>Launch campaign</button>}
                    <button type="button" className="mkt-launch" data-testid="open-running-board" onClick={() => setRunning(true)}>Running</button>
                    <div className="mkt-kicker">{ownerKind === 'EMPIRE' ? 'Streaming desk' : 'Production desk'}</div>
                    <h1>Marketing</h1>
                </div>
                <div className="mkt-cash">
                    <span>{ownerKind === 'EMPIRE' ? 'Company cash' : 'House balance'}</span>
                    <b data-testid="marketing-cash">{formatMoney(cash)}</b>
                    <span>Personal cash stays separate</span>
                </div>
            </header>
            <div className="mkt-tabs">
                {(['build', 'calendar', 'history', 'frame', 'wire'] as Tab[]).map(id => (
                    <button key={id} type="button" className={`mkt-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
                        {id === 'frame' ? 'Frame' : id === 'wire' ? 'Wire' : id[0].toUpperCase() + id.slice(1)}
                    </button>
                ))}
            </div>
            <div className="mkt-body">
                {tab === 'build' && (
                    <div className="mkt-build">
                        <div className="mkt-controls">
                            <div className="mkt-films">
                                {titles.length === 0 && <p className="mkt-notes">No titles on this slate yet. Rival desks are still posting.</p>}
                                {titles.map(title => (
                                    <button key={title.id} type="button" className={`mkt-film ${title.id === titleId ? 'on' : ''}`} onClick={() => setTitleId(title.id)} data-testid={`title-${title.id}`}>
                                        <small>{title.statusLine}</small>
                                        <strong>{title.name}</strong>
                                    </button>
                                ))}
                            </div>
                            <div className="mkt-cats">
                                {MARKETING_CATEGORIES.map(row => (
                                    <button key={row.id} type="button" className={`mkt-chip ${category === row.id ? 'on' : ''}`} onClick={() => { setCategory(row.id); const first = MARKETING_ACTIONS.find(actionRow => actionRow.category === row.id); if (first) setActionId(first.id); }}>
                                        {row.name}
                                    </button>
                                ))}
                            </div>
                            <div className="mkt-actions">
                                {MARKETING_ACTIONS.filter(row => row.category === category).map(row => {
                                    const sample = titleId ? quoteMarketing(player, { ...draft, actionId: row.id, key: `${key}-${row.id}` }) : undefined;
                                    const samplePoster = sample?.poster || poster;
                                    return (
                                        <button key={row.id} type="button" className={`mkt-action ${actionId === row.id ? 'on' : ''}`} onClick={() => setActionId(row.id)} data-testid={`action-${row.id}`}>
                                            <div className="mini">{samplePoster ? <PosterThumb poster={samplePoster} /> : null}</div>
                                            <b>{row.name}</b>
                                            <em>{row.blurb}</em>
                                            <div className="meta"><span>{sample?.quote ? formatMoney(sample.quote.cost) : '—'}</span><span>{sample?.quote ? formatCount(sample.quote.reach) : ''}</span></div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mkt-label">Layout</div>
                            <div className="mkt-swatches">
                                {LAYOUTS.map(layout => (
                                    <button key={layout.id} type="button" className={`mkt-layout ${creative.layoutId === layout.id ? 'on' : ''}`} onClick={() => setCreative({ ...creative, layoutId: layout.id })} aria-label={layout.name}>
                                        {poster ? <PosterThumb poster={{ ...poster, layoutId: layout.id }} /> : layout.name}
                                    </button>
                                ))}
                            </div>
                            <div className="mkt-label">Palette</div>
                            <div className="mkt-swatches">
                                {PALETTES.map(palette => (
                                    <button key={palette.id} type="button" className={`mkt-swatch ${creative.paletteId === palette.id ? 'on' : ''}`} style={{ background: palette.gradient }} onClick={() => setCreative({ ...creative, paletteId: palette.id })} aria-label={palette.name} />
                                ))}
                            </div>
                            {action?.category === 'OUTDOOR' && (
                                <div className="mkt-row">
                                    {SIZES.map(size => (
                                        <button key={size.id} type="button" className={`mkt-chip ${creative.sizeId === size.id ? 'on' : ''}`} onClick={() => setCreative({ ...creative, sizeId: size.id })}>{size.name}</button>
                                    ))}
                                </div>
                            )}
                            {(action?.category === 'STAGE' || action?.category === 'PRESS') && (
                                <div className="mkt-row">
                                    {STAGE_THEMES.map(theme => (
                                        <button key={theme.id} type="button" className={`mkt-chip ${creative.stageTheme === theme.id ? 'on' : ''}`} onClick={() => setCreative({ ...creative, stageTheme: theme.id })}>{theme.name}</button>
                                    ))}
                                </div>
                            )}
                            {(action?.category === 'DIGITAL' || action?.category === 'PRESS' || action?.category === 'STAGE') && (
                                <div className="mkt-row">
                                    {SOCIAL_FORMATS.map(format => (
                                        <button key={format.id} type="button" className={`mkt-chip ${creative.socialFormat === format.id ? 'on' : ''}`} onClick={() => setCreative({ ...creative, socialFormat: format.id as MarketingSocialFormat })}>{format.name}</button>
                                    ))}
                                </div>
                            )}
                            <div className="mkt-row">
                                {EMPHASIS.map(item => (
                                    <button key={item.id} type="button" className={`mkt-chip ${creative.castEmphasis === item.id ? 'on' : ''}`} onClick={() => setCreative({ ...creative, castEmphasis: item.id as MarketingEmphasis })}>{item.name}</button>
                                ))}
                            </div>
                            <label className="mkt-field">
                                <span>Tagline</span>
                                <input value={creative.tagline} maxLength={90} onChange={event => setCreative({ ...creative, tagline: event.target.value })} />
                            </label>
                            <div className="mkt-row">
                                {DATE_STYLES.map(style => (
                                    <button key={style.id} type="button" className={`mkt-chip ${creative.dateStyle === style.id ? 'on' : ''}`} onClick={() => setCreative({ ...creative, dateStyle: style.id as MarketingDateStyle })}>{style.name}</button>
                                ))}
                            </div>
                            <div className="mkt-row">
                                <label className="mkt-field">
                                    <span>Region</span>
                                    <select value={target.regionId} onChange={event => setRegion(event.target.value)}>
                                        {LAUNCH_REGIONS.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
                                        <option value="WORLD">World</option>
                                    </select>
                                </label>
                                <label className="mkt-field">
                                    <span>Country</span>
                                    <select value={target.countryId || ''} onChange={event => {
                                        const country = countries.find(row => row.id === event.target.value);
                                        const city = country ? (REGION_CITIES[country.regionId] || [])[0] : undefined;
                                        setTarget({ ...target, countryId: country?.id, language: country?.languages[0]?.name || target.language, cityId: city?.id });
                                    }}>
                                        {countries.map(country => <option key={country.id} value={country.id}>{country.name}</option>)}
                                    </select>
                                </label>
                                <label className="mkt-field">
                                    <span>City</span>
                                    <select value={target.cityId || ''} onChange={event => setTarget({ ...target, cityId: event.target.value || undefined })}>
                                        <option value="">No city</option>
                                        {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                                    </select>
                                </label>
                            </div>
                            <div className="mkt-row">
                                <label className="mkt-field">
                                    <span>Language</span>
                                    <select value={target.language || ''} onChange={event => setTarget({ ...target, language: event.target.value })}>
                                        {(languages.length ? languages : ['English']).map(language => <option key={language}>{language}</option>)}
                                    </select>
                                </label>
                                <label className="mkt-field">
                                    <span>Audience</span>
                                    <select value={target.audience} onChange={event => setTarget({ ...target, audience: event.target.value as MarketingAudience })}>
                                        {AUDIENCES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </select>
                                </label>
                                <label className="mkt-field">
                                    <span>Starts in weeks</span>
                                    <input type="number" min={0} max={52} value={target.startOffset} onChange={event => setTarget({ ...target, startOffset: Number(event.target.value) })} />
                                </label>
                                <label className="mkt-field">
                                    <span>Duration</span>
                                    <input type="number" min={1} max={12} value={target.durationWeeks} onChange={event => setTarget({ ...target, durationWeeks: Number(event.target.value) })} />
                                </label>
                            </div>
                            {quoted.quote && (
                                <div className="mkt-quote" data-testid="quote-card">
                                    <div className="mkt-meter"><span className="mkt-label">Cost</span><b>{formatMoney(quoted.quote.cost)}</b>{quoted.quote.castFee ? <span className="mkt-label">includes {formatMoney(quoted.quote.castFee)} cast</span> : null}</div>
                                    <div className="mkt-meter"><span className="mkt-label">Reach</span><b>{formatCount(quoted.quote.reachLow)}–{formatCount(quoted.quote.reachHigh)}</b><div className="mkt-bar"><i style={{ width: `${Math.min(100, quoted.quote.reach / 200000)}%` }} /></div></div>
                                    <div className="mkt-meter"><span className="mkt-label">Hype</span><b>+{quoted.quote.hype}</b><div className="mkt-bar"><i style={{ width: `${Math.min(100, quoted.quote.hype * 5)}%` }} /></div></div>
                                    <div className="mkt-meter"><span className="mkt-label">{ownerKind === 'EMPIRE' ? 'Stream interest' : 'Ticket interest'}</span><b>+{ownerKind === 'EMPIRE' ? quoted.quote.streamInterest : quoted.quote.ticketInterest}</b></div>
                                </div>
                            )}
                            {quoted.quote && <ul className="mkt-notes">{quoted.quote.notes.map(note => <li key={note}>{note}</li>)}</ul>}
                            {error && <p className="mkt-error" data-testid="marketing-error">{error}</p>}
                            {quoted.error && <p className="mkt-error">{quoted.error}</p>}
                            <button type="button" className="mkt-go" data-testid="open-confirm" disabled={!quoted.quote || cash < (quoted.quote?.cost || 0)} onClick={() => { setError(''); setConfirming(true); }}>
                                Preview the buy
                            </button>
                        </div>
                        <div className="mkt-stage" data-testid="marketing-stage">
                            {poster && (
                                <Surface
                                    anim={ACTION_SCENE[actionId] || (scene === 'stage' ? 'fest' : scene === 'frame' ? 'feed' : 'board')}
                                    brand={player.ownPlatform?.brand || DEFAULT_BRAND}
                                    name={player.ownPlatform?.name || ownerName}
                                    title={poster.title}
                                />
                            )}
                        </div>
                    </div>
                )}
                {tab === 'calendar' && (
                    <div className="cal" data-testid="campaign-calendar">
                        {ourCampaigns.length === 0 && <p className="mkt-notes">Nothing booked. Rival noise still shows in the feeds.</p>}
                        {ourCampaigns.map(campaign => {
                            const start = campaign.startAbsolute - (player.age - 1) * 52 - (player.currentWeek - 1);
                            const span = campaign.endAbsolute - campaign.startAbsolute + 1;
                            const left = Math.max(0, Math.min(11, start));
                            return (
                                <div key={campaign.id} className="cal-row">
                                    <div>{campaign.titleName}<div className="handle">{campaign.status}</div></div>
                                    <div className="cal-track">
                                        <div className="cal-bar" style={{ left: `${left * 8}%`, width: `${Math.max(8, span * 8)}%` }}>{actionByIdName(campaign.actionId)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {tab === 'history' && (
                    <div className="hist" data-testid="campaign-history">
                        {titles.map(title => {
                            const rows = ourCampaigns.filter(campaign => campaign.titleId === title.id);
                            const record = (desk?.records || []).find(row => row.ownerKind === ownerKind && row.ownerId === ownerId && row.titleId === title.id);
                            return (
                                <article key={title.id}>
                                    <strong>{title.name}</strong>
                                    <div className="handle">{title.statusLine}{record ? ` · spent ${formatMoney(record.spent)} · reach ${formatCount(record.reach)}` : ''}</div>
                                    {rows.length === 0 && <p className="mkt-notes">No buys yet.</p>}
                                    {rows.map(campaign => (
                                        <div key={campaign.id} className="region-bars">
                                            <div>{actionByIdName(campaign.actionId)} · {campaign.status} · {campaign.outcome.note}</div>
                                            {campaign.outcome.regions.map(region => (
                                                <div key={region.id}>
                                                    <span>{region.name} · {formatCount(region.reach)}</span>
                                                    <div className="mkt-bar"><i style={{ width: `${Math.min(100, region.reach / 50000)}%` }} /></div>
                                                </div>
                                            ))}
                                            {campaign.outcome.channels.map(channel => (
                                                <div key={channel.id}>{channel.name} · sentiment {channel.sentiment}</div>
                                            ))}
                                        </div>
                                    ))}
                                </article>
                            );
                        })}
                    </div>
                )}
                {(tab === 'frame' || tab === 'wire') && (
                    <div>
                        <div className="trend">{trends.map(tag => <span key={tag}>{tag}</span>)}</div>
                        <div className="mkt-row" style={{ margin: '8px 0' }}>
                            {(['ALL', 'OURS', 'RIVALS'] as const).map(id => (
                                <button key={id} type="button" className={`mkt-chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{id === 'ALL' ? 'All desks' : id === 'OURS' ? 'This company' : 'Rivals'}</button>
                            ))}
                        </div>
                        <div className="feed-list" data-testid={tab === 'frame' ? 'frame-feed' : 'wire-feed'}>
                            {posts.filter(post => post.network === (tab === 'frame' ? 'FRAME' : 'WIRE')).map(post => (
                                tab === 'frame' ? <FrameCard key={post.id} post={post} /> : <WireCard key={post.id} post={post} />
                            ))}
                            {posts.filter(post => post.network === (tab === 'frame' ? 'FRAME' : 'WIRE')).length === 0 && <p className="mkt-notes">The feed is quiet until a desk spends.</p>}
                        </div>
                    </div>
                )}
            </div>
            {confirming && poster && quoted.quote && (
                <div className="mkt-sheet" data-testid="confirm-sheet">
                    <article>
                        <div className="mkt-kicker">Confirm spend</div>
                        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 48, margin: '4px 0 12px' }}>{poster.title}</h2>
                        <div className="mkt-stage" style={{ position: 'relative', marginBottom: 12 }}>
                            <Surface
                                anim={ACTION_SCENE[actionId] || 'board'}
                                brand={player.ownPlatform?.brand || DEFAULT_BRAND}
                                name={player.ownPlatform?.name || ownerName}
                                title={poster.title}
                            />
                        </div>
                        <p className="mkt-notes">{quoted.quote.notes[0]}</p>
                        <div className="mkt-quote">
                            <div className="mkt-meter"><span className="mkt-label">Leaves the company</span><b>{formatMoney(quoted.quote.cost)}</b></div>
                            <div className="mkt-meter"><span className="mkt-label">Cash after</span><b>{formatMoney(cash - quoted.quote.cost)}</b></div>
                            <div className="mkt-meter"><span className="mkt-label">Estimated reach</span><b>{formatCount(quoted.quote.reachLow)}–{formatCount(quoted.quote.reachHigh)}</b></div>
                            <div className="mkt-meter"><span className="mkt-label">Your cash</span><b>Unchanged</b></div>
                        </div>
                        {error && <p className="mkt-error">{error}</p>}
                        <div className="mkt-sheet-actions">
                            <button type="button" className="mkt-chip" onClick={() => setConfirming(false)}>Back</button>
                            <button type="button" className="mkt-go" data-testid="confirm-spend" onClick={buy}>Spend {formatMoney(quoted.quote.cost)}</button>
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
};

const actionByIdName = (id: string) => MARKETING_ACTIONS.find(action => action.id === id)?.name || id;
