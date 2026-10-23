import React, { useMemo, useState } from 'react';
import { Bell, DollarSign, Flame, Home, Layout, Music, Play, Plus, Radio, Search, User, X } from 'lucide-react';
import { Player, YoutubeChannelKind, YoutubeVideoType } from '../../types';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { generateYoutubeFeed } from '../../services/youtubeLogic';
import { migrateYoutubeSave, playerProjects, syncOfficialChannels } from '../../services/youtubeMarketing';
import { setChannel } from './youtube/actions';
import { Av, Logo } from './youtube/bits';
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
    const channel = useMemo(() => syncOfficialChannels(player, migrateYoutubeSave(player)), [player]);
    const projects = useMemo(() => playerProjects({ ...player, youtube: channel }), [player, channel]);
    const videos = useMemo(() => {
        const feed = generateYoutubeFeed({ ...player, youtube: channel });
        const owned = [
            ...channel.videos,
            ...(channel.officialChannels?.studio?.videos || []),
            ...(channel.officialChannels?.empirePlus?.videos || []),
        ];
        const seen = new Set<string>();
        return [...owned, ...feed].filter(video => {
            if (seen.has(video.id)) return false;
            seen.add(video.id);
            return true;
        }).sort((a, b) => b.views - a.views);
    }, [player, channel]);
    const kind: YoutubeChannelKind = channel.activeChannel || 'personal';
    const absWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const focus = projects.find(item => item.id === (projectId || projects[0]?.id)) || projects[0];
    const releaseAbs = focus ? (focus.projectDetails?.hiddenStats?.releaseWeek && focus.projectDetails.hiddenStats.releaseWeek > 52
        ? focus.projectDetails.hiddenStats.releaseWeek
        : null) : null;
    const weeksLeft = releaseAbs != null ? Math.max(0, releaseAbs - absWeek) : null;
    const notices = (channel.activeCollabs?.length || 0) + (channel.activeBrandDeals?.length || 0) + (channel.leaks || []).filter(leak => !leak.resolved).length;
    const bleed = screen === 'watch' || screen === 'shorts' || screen === 'live';

    const go = (next: YtScreen) => {
        setError(null);
        setYouOpen(false);
        setScreen(next);
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
    };

    const switchKind = (next: YoutubeChannelKind) => onUpdatePlayer(setChannel(player, next));

    return (
        <YtContext.Provider value={api}>
            <div className={`yt-root${bleed ? ' bleed' : ''}`} data-yt-screen={screen}>
                <div className="app">
                    <header className="top">
                        <Logo onClick={() => go('home')} />
                        <label className="search">
                            <Search size={16} />
                            <input value={query} placeholder="Search videos and creators" onChange={event => { setQuery(event.target.value); if (screen !== 'home') go('home'); }} />
                        </label>
                        <div className="tright">
                            <button className="btn red" onClick={() => go('upload')} data-yt-nav="upload"><Plus size={16} /> Create</button>
                            <button className="iconbtn" onClick={() => go('money')} aria-label="Alerts">
                                <Bell size={18} />
                                {notices > 0 && <span className="dot">{notices}</span>}
                            </button>
                            <button className="switcher" onClick={() => switchKind(kind === 'personal' ? 'studio' : kind === 'studio' ? 'empirePlus' : 'personal')}>
                                <Av kind={kind === 'empirePlus' ? 'eplus' : kind === 'studio' ? 'studio' : 'me'} label={player.name} size={28} />
                                <span><b>{kind === 'personal' ? player.name.split(' ')[0] : kind === 'studio' ? 'Studio' : 'Empire+'}</b><small>{kind}</small></span>
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
                            <button key={item.id} className={`ri${screen === item.id ? ' on' : ''}`} onClick={() => go(item.id)} data-yt-nav={item.id}>{item.icon}{item.label}</button>
                        ))}
                        <div className="rh">Your channels</div>
                        <button className={`chan${kind === 'personal' ? ' on' : ''}`} onClick={() => switchKind('personal')}><Av kind="me" label={player.name} size={28} /><span><b>{player.name.split(' ')[0]}</b><small>{channel.handle}</small></span></button>
                        <button className={`chan${kind === 'studio' ? ' on' : ''}`} onClick={() => switchKind('studio')}><Av kind="studio" size={28} /><span><b>Studio</b><small>{channel.officialChannels?.studio?.handle || 'Opens with a house'}</small></span></button>
                        <button className={`chan${kind === 'empirePlus' ? ' on' : ''}`} onClick={() => switchKind('empirePlus')}><Av kind="eplus" size={28} /><span><b>Empire+</b><small>{channel.officialChannels?.empirePlus?.handle || 'When Empire+ is live'}</small></span></button>
                        <div className="weekcard">
                            <div className="k">This week</div>
                            <div className="v">{focus?.projectDetails?.title || 'No release on the slate'}</div>
                            <div className="dim">{weeksLeft != null ? `${weeksLeft} weeks to release` : `Week ${player.currentWeek}`}</div>
                            <div className="bar"><i style={{ width: weeksLeft != null ? `${Math.max(8, 100 - weeksLeft * 8)}%` : '12%' }} /></div>
                        </div>
                        <button className="ri" onClick={onBack} data-yt-nav="close"><X size={18} /> Close</button>
                    </nav>
                    <main>
                        {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
                        {screenFor(screen)}
                    </main>
                </div>
                <header className="mtop">
                    <Logo small onClick={() => go('home')} />
                    <label className="search" style={{ maxWidth: 'none', flex: 1 }}>
                        <Search size={14} />
                        <input value={query} placeholder="Search" onChange={event => { setQuery(event.target.value); if (screen !== 'home') go('home'); }} />
                    </label>
                    <button className="iconbtn" onClick={() => go('money')} aria-label="Alerts"><Bell size={18} />{notices > 0 && <span className="dot">{notices}</span>}</button>
                </header>
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
                            {(['studio', 'channel', 'trending', 'music', 'live', 'money'] as YtScreen[]).map(item => (
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
