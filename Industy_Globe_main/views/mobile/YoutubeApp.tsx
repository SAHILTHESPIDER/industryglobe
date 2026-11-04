import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, DollarSign, Flame, Home, Layout, Lock, Menu, Mic, Music, Play, Plus, Radio, Search, User, Users, Video, X } from 'lucide-react';
import { Player, YoutubeChannelKind, YoutubeVideoType } from '../../types';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { generateYoutubeFeed } from '../../services/youtubeLogic';
import { ensureCampaign, migrateYoutubeSave, playerProjects, syncOfficialChannels } from '../../services/youtubeMarketing';
import { syncRivalYoutube } from '../../services/youtubeRivals';
import { syncCreatorYoutube } from '../../services/youtubePeople';
import { settlePlayButtons } from '../../services/youtubeAwards';
import { EXTRA_CHANNEL_UNLOCK_PRICE, channelSwitchAllowed, lookFor } from '../../services/youtubeCustomize';
import { setChannel } from './youtube/actions';
import { Ceremony, UnlockSheet, dismissOpenCeremony } from './youtube/features';
import { ScreenFade } from './youtube/motion';
import { Av, formatCompact, Logo } from './youtube/bits';
import { screenFor } from './youtube/screens';
import { YtApi, YtContext, YtScreen } from './youtube/state';
import './youtube/youtube.css';

interface YoutubeAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
    initialScreen?: YtScreen;
}

const DISCOVER: { id: YtScreen; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home size={18} /> },
    { id: 'shorts', label: 'Shorts', icon: <Play size={18} /> },
    { id: 'trending', label: 'Trending', icon: <Flame size={18} /> },
    { id: 'subs', label: 'Subscriptions', icon: <Users size={18} /> },
    { id: 'music', label: 'Music', icon: <Music size={18} /> },
    { id: 'live', label: 'Live', icon: <Radio size={18} /> },
];

const EMPIRE: { id: YtScreen; label: string; icon: React.ReactNode }[] = [
    { id: 'hub', label: 'Marketing Hub', icon: <Flame size={18} /> },
    { id: 'studio', label: 'Creator Studio', icon: <Layout size={18} /> },
    { id: 'channel', label: 'Channel', icon: <User size={18} /> },
    { id: 'money', label: 'Earn & milestones', icon: <DollarSign size={18} /> },
    { id: 'upload', label: 'Create', icon: <Plus size={18} /> },
];

export const YoutubeApp: React.FC<YoutubeAppProps> = ({ player, onBack, onUpdatePlayer, initialScreen = 'home' }) => {
    const [screen, setScreen] = useState<YtScreen>(initialScreen);
    const [watchId, setWatchId] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [presetType, setPresetType] = useState<YoutubeVideoType | null>(null);
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [youOpen, setYouOpen] = useState(false);
    const [mobileSearch, setMobileSearch] = useState(false);
    const [rivalId, setRivalId] = useState<string | null>(null);
    const [creatorId, setCreatorId] = useState<string | null>(null);
    const [lockOpen, setLockOpen] = useState(false);
    const channel = useMemo(() => {
        const migrated = syncOfficialChannels(player, migrateYoutubeSave(player));
        const rivals = syncRivalYoutube(player, migrated, 'view').channel;
        return syncCreatorYoutube(player, rivals, 'view').channel;
    }, [player]);
    const projects = useMemo(() => playerProjects({ ...player, youtube: channel }), [player, channel]);
    const videos = useMemo(() => {
        const feed = generateYoutubeFeed({ ...player, youtube: channel });
        const owned = [
            ...channel.videos,
            ...(channel.officialChannels?.studio?.videos || []),
            ...(channel.officialChannels?.empirePlus?.videos || []),
            ...(channel.rivalChannels || []).flatMap(rival => rival.videos || []),
        ];
        const seen = new Set<string>();
        return [...owned, ...feed].filter(video => {
            if (seen.has(video.id)) return false;
            seen.add(video.id);
            return true;
        }).sort((a, b) => b.views - a.views);
    }, [player, channel]);
    const kind: YoutubeChannelKind = channel.activeChannel || 'personal';
    useEffect(() => {
        const migrated = { ...player, youtube: migrateYoutubeSave(player) };
        const settled = settlePlayButtons(migrated);
        const before = player.youtube;
        const after = settled.player.youtube;
        const changed = settled.notes.length > 0
            || before.schemaVersion !== after.schemaVersion
            || before.zeroStart !== after.zeroStart
            || before.extraChannelsUnlocked !== after.extraChannelsUnlocked
            || before.awardsMigrated !== after.awardsMigrated
            || JSON.stringify(before.playButtons || null) !== JSON.stringify(after.playButtons || null)
            || JSON.stringify(before.pendingCeremonies || null) !== JSON.stringify(after.pendingCeremonies || null);
        if (!changed) return;
        const notes = settled.notes.map(message => ({ week: player.currentWeek, year: player.age, message, type: 'positive' as const }));
        onUpdatePlayer(notes.length ? { ...settled.player, logs: [...notes, ...(settled.player.logs || [])].slice(0, 50) } : settled.player);
    }, [player, onUpdatePlayer]);
    const absWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const focus = projects.find(item => item.id === (projectId || projects[0]?.id)) || projects[0];
    const releaseAbs = focus ? (focus.projectDetails?.hiddenStats?.releaseWeek && focus.projectDetails.hiddenStats.releaseWeek > 52
        ? focus.projectDetails.hiddenStats.releaseWeek
        : null) : null;
    const weeksLeft = releaseAbs != null ? Math.max(0, releaseAbs - absWeek) : null;
    const notices = (channel.activeCollabs?.length || 0) + (channel.activeBrandDeals?.length || 0) + (channel.leaks || []).filter(leak => !leak.resolved).length;
    const badge = player.id === 'showcase' ? '9+' : notices > 9 ? '9+' : notices > 0 ? String(notices) : '';
    const bleed = screen === 'watch' || screen === 'shorts' || screen === 'live';
    const campaign = focus ? ensureCampaign(channel, focus.id) : null;
    const releasedDrops = campaign?.drops.filter(drop => drop.status === 'RELEASED').length || 0;
    const nextDrop = campaign?.drops.filter(drop => drop.status === 'SCHEDULED').sort((a, b) => a.scheduledWeekAbs - b.scheduledWeekAbs)[0];
    const weekOf = (abs: number) => {
        let week = player.currentWeek + (abs - absWeek);
        while (week > 52) week -= 52;
        while (week < 1) week += 52;
        return week;
    };
    const hype = Math.round(campaign?.campaignHype ?? focus?.projectDetails?.hiddenStats?.ytCampaignHype ?? 0);
    const studio = channel.officialChannels?.studio;
    const empire = channel.officialChannels?.empirePlus;
    const house = (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE');
    const studioStem = (studio?.handle || '').replace('@', '').replace(/studios$/i, '');
    const studioName = house?.name || (studioStem ? `${studioStem.charAt(0).toUpperCase()}${studioStem.slice(1)} Studios` : 'Studio');

    const go = (next: YtScreen) => {
        setError(null);
        setYouOpen(false);
        setScreen(next);
    };

    const switchKind = (next: YoutubeChannelKind) => {
        if (!channelSwitchAllowed(channel, next)) {
            setLockOpen(true);
            return;
        }
        onUpdatePlayer(setChannel(player, next));
    };

    const api: YtApi = {
        player: { ...player, youtube: channel },
        channel,
        screen,
        go,
        watchId,
        openVideo: (id) => { setWatchId(id); go('watch'); },
        projectId: projectId || projects[0]?.id || null,
        setProjectId,
        presetType,
        armUpload: (type, nextProject) => {
            setPresetType(type);
            if (nextProject) setProjectId(nextProject);
            go('upload');
        },
        query,
        setQuery,
        error,
        clearError: () => setError(null),
        apply: (result) => {
            if (result.error) {
                setError(result.error);
                return;
            }
            setError(null);
            onUpdatePlayer(result.player);
            if (result.screen) go(result.screen);
        },
        update: onUpdatePlayer,
        onBack,
        videos,
        projects,
        absWeek,
        kind,
        rivalId,
        openRival: (id) => { setRivalId(id); go('rival'); },
        creatorId,
        openCreator: (id) => { setCreatorId(id); go('creator'); },
        switchChannel: (next) => switchKind(next),
    };

    const ceremony = channel.pendingCeremonies?.[0];
    const ceremonySubs = ceremony
        ? (ceremony.channelKind === 'studio' ? channel.officialChannels?.studio?.subscribers : ceremony.channelKind === 'empirePlus' ? channel.officialChannels?.empirePlus?.subscribers : channel.subscribers) || 0
        : 0;
    const personalLook = lookFor(channel, 'personal');
    const studioLook = lookFor(channel, 'studio');
    const empireLook = lookFor(channel, 'empirePlus');
    const locked = !channel.extraChannelsUnlocked;

    return (
        <YtContext.Provider value={api}>
            <div className={`yt-root${bleed ? ' bleed' : ''}${(channel.controversy || 0) >= 70 ? ' yt-heat' : ''}`} data-yt-screen={screen}>
                <div className="app">
                    <header className="top">
                        <button className="iconbtn" aria-label="Menu" onClick={() => go('home')}><Menu size={20} /></button>
                        <Logo onClick={() => go('home')} />
                        <label className="search">
                            <Search size={16} />
                            <input value={query} placeholder="Search trailers, songs, creators, studios" onChange={event => { setQuery(event.target.value); if (screen !== 'home') go('home'); }} />
                            <button type="button" className="mic" aria-label="Search by voice" onClick={event => { event.preventDefault(); (event.currentTarget.previousElementSibling as HTMLInputElement | null)?.focus(); }}><Mic size={14} /></button>
                        </label>
                        <div className="tright">
                            <button className="btn" onClick={() => go('upload')} data-yt-nav="upload"><Plus size={16} /> Create</button>
                            <button className="iconbtn" onClick={() => go('money')} aria-label="Alerts">
                                <Bell size={18} />
                                {badge && <span className="dot">{badge}</span>}
                            </button>
                            <button className="switcher" onClick={() => switchKind(kind === 'personal' ? 'studio' : kind === 'studio' ? 'empirePlus' : 'personal')} data-yt-switch>
                                <span className="stack">
                                    <Av kind="me" label={personalLook.name || player.name} size={30} src={personalLook.avatarData} />
                                    <Av kind="studio" size={30} />
                                    <Av kind="eplus" size={30} />
                                </span>
                                <span><b>{kind === 'personal' ? (personalLook.name || player.name) : kind === 'studio' ? (studioLook.name || studioName) : (empireLook.name || 'Empire+')}</b><small>{locked && kind === 'personal' ? 'Unlock more channels' : 'Switch channel'}</small></span>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    </header>
                    <nav className="rail">
                        <div className="rh">Discover</div>
                        {DISCOVER.map(item => (
                            <button key={item.id} className={`ri${screen === item.id ? ' on' : ''}`} onClick={() => go(item.id)} data-yt-nav={item.id}>{item.icon}{item.label}</button>
                        ))}
                        <div className="rh">Your empire</div>
                        {EMPIRE.map(item => (
                            <button key={item.id} className={`ri${screen === item.id ? ' on' : ''}`} onClick={() => go(item.id)} data-yt-nav={item.id}>
                                {item.icon}{item.label}
                                {item.id === 'hub' && focus && releasedDrops > 0 && <span className="ct">{releasedDrops}</span>}
                            </button>
                        ))}
                        <div className="rh">Your channels</div>
                        <button className={`chan${kind === 'personal' ? ' on' : ''}`} onClick={() => switchKind('personal')}><Av kind="me" label={personalLook.name || player.name} size={26} src={personalLook.avatarData} /><span><b>{personalLook.name || player.name}</b><small>Personal · {formatCompact(channel.subscribers)}</small></span></button>
                        <button className={`chan${kind === 'studio' ? ' on' : ''}${locked ? ' locked' : ''}`} onClick={() => switchKind('studio')} data-yt-channel="studio"><Av kind="studio" size={26} />{locked && <Lock size={12} />} <span><b>{studioLook.name || studioName}</b><small>{locked ? `Locked · ${formatCompact(EXTRA_CHANNEL_UNLOCK_PRICE)}` : studio ? `Official · ${formatCompact(studio.subscribers)}` : 'Opens with a house'}</small></span></button>
                        <button className={`chan${kind === 'empirePlus' ? ' on' : ''}${locked ? ' locked' : ''}`} onClick={() => switchKind('empirePlus')} data-yt-channel="empirePlus"><Av kind="eplus" size={26} /><span><b>{empireLook.name || 'Empire+'}</b><small>{locked ? 'Locked' : empire ? `Official · ${formatCompact(empire.subscribers)}` : 'When Empire+ is live'}</small></span></button>
                        <div className="weekcard">
                            <div className="k">Week {player.currentWeek} · {1998 + player.age}</div>
                            <div className="v">{focus?.projectDetails?.title || 'No release'}{weeksLeft != null ? <> opens in <span className="red">{weeksLeft} wks</span></> : null}</div>
                            <div className="bar"><i style={{ width: weeksLeft != null ? `${Math.max(8, Math.min(100, 100 - weeksLeft * 4))}%` : '12%' }} /></div>
                            <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>Campaign hype {hype || '—'}{nextDrop ? ` · next drop W${weekOf(nextDrop.scheduledWeekAbs)}` : ''}</div>
                        </div>
                        <button className="ri" onClick={onBack} data-yt-nav="close"><X size={18} /> Close</button>
                    </nav>
                    <main>
                        {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
                        <ScreenFade screen={screen}>{screenFor(screen)}</ScreenFade>
                        {ceremony && <Ceremony ceremony={ceremony} subs={ceremonySubs} onClose={() => onUpdatePlayer(dismissOpenCeremony(player))} />}
                        {lockOpen && <UnlockSheet onClose={() => setLockOpen(false)} />}
                    </main>
                </div>
                <header className="mtop">
                    <Logo small onClick={() => go('home')} />
                    <div className="r">
                        <button className="iconbtn" aria-label="Create" onClick={() => go('upload')}><Video size={18} /></button>
                        <button className="iconbtn" onClick={() => go('money')} aria-label="Alerts"><Bell size={18} />{badge && <span className="dot">{badge}</span>}</button>
                        <button className="iconbtn" aria-label="Search" onClick={() => setMobileSearch(open => !open)}><Search size={18} /></button>
                        <button aria-label="You" onClick={() => setYouOpen(true)}><Av kind="me" label={player.name} size={28} /></button>
                    </div>
                </header>
                {mobileSearch && (
                    <label className="search msearch">
                        <Search size={14} />
                        <input value={query} placeholder="Search trailers, songs, creators" onChange={event => { setQuery(event.target.value); if (screen !== 'home') go('home'); }} />
                        <button type="button" className="mic" aria-label="Voice search"><Mic size={14} /></button>
                    </label>
                )}
                <nav className="bnav">
                    <button className={screen === 'home' ? 'on' : ''} onClick={() => go('home')} data-yt-nav="home"><Home size={18} />Home</button>
                    <button className={screen === 'shorts' ? 'on' : ''} onClick={() => go('shorts')} data-yt-nav="shorts"><Play size={18} />Shorts</button>
                    <button onClick={() => go('upload')} data-yt-nav="upload"><span className="plus"><Plus size={18} /></span></button>
                    <button className={screen === 'hub' ? 'on' : ''} onClick={() => go('hub')} data-yt-nav="hub"><Layout size={18} />Hub</button>
                    <button className={youOpen ? 'on' : ''} onClick={() => setYouOpen(true)} data-yt-nav="you"><User size={18} />You</button>
                </nav>
                {youOpen && (
                    <div className="sheet" onClick={() => setYouOpen(false)}>
                        <div className="panel" onClick={event => event.stopPropagation()}>
                            {(['studio', 'channel', 'trending', 'subs', 'music', 'live', 'money'] as YtScreen[]).map(item => (
                                <button key={item} className="btn" onClick={() => go(item)} data-yt-nav={item}>{item}</button>
                            ))}
                            <button className="btn" onClick={onBack}>Close YouTube</button>
                        </div>
                    </div>
                )}
            </div>
        </YtContext.Provider>
    );
};
