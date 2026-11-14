import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Player } from '../../../types';
import { formatCompact, formatPeople } from '../../../services/ownPlatform/logic';
import { networkStats, readDesk } from '../../../services/ownPlatform/platformDesk';
import { OfferTab } from './OfferTab';
import { NetworkTab } from './NetworkTab';
import { TechTab } from './TechTab';
import { ProductTab, StatusTab } from './RestTabs';
import { LaunchCampaign } from '../../marketing/launch/LaunchCampaign';
import './platform.css';

export type PlatformTab = 'offer' | 'network' | 'tech' | 'product' | 'status';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    onBack?: () => void;
    onStudio?: () => void;
    initialTab?: PlatformTab;
    focusId?: string;
    editing?: boolean;
    lead?: 'deals' | 'plans';
    shot?: 'grid' | 'detail' | 'ladder';
}

const useCount = (value: number, calm: boolean) => {
    const [shown, setShown] = useState(calm ? value : 0);
    useEffect(() => {
        if (calm) {
            setShown(value);
            return;
        }
        const start = performance.now();
        const begin = shown;
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / 700);
            const eased = 1 - (1 - t) ** 3;
            setShown(begin + (value - begin) * eased);
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, calm]);
    return shown;
};

export const PlatformArea: React.FC<Props> = ({ player, onPlayer, onBack, onStudio, initialTab = 'network', focusId, editing, lead, shot }) => {
    const state = player.ownPlatform;
    const [tab, setTab] = useState<PlatformTab>(initialTab);
    const [launchOpen, setLaunchOpen] = useState(false);
    const [techFocus, setTechFocus] = useState(focusId || '');
    const [calm, setCalm] = useState(() => {
        if (typeof window === 'undefined') return false;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const settled = new URLSearchParams(window.location.search).get('settled') === '1';
        return reduce || settled;
    });
    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const settled = document.querySelector('.settled');
        if (reduce || settled) setCalm(true);
    }, []);
    const desk = state ? readDesk(state) : null;
    const stats = state ? networkStats(state) : null;
    const peak = stats ? Math.round(stats.load * 100) : 0;
    const playback = desk?.playbackPct ?? state?.uptime;
    const peakShown = Math.round(useCount(peak, calm));
    const citiesShown = Math.round(useCount(stats?.cities || 0, calm));
    const debtShown = Math.round(useCount(desk?.techDebt || 0, calm));
    const playShown = Math.round(useCount(playback ?? 0, calm));
    if (!state || !desk || !stats) return null;
    const live = state.stage === 'LIVE';
    const openIncident = (state.incidents || []).some(row => row.open);

    return (
        <div className={`plat${calm ? ' settled' : ''}`} data-testid="platform-area" data-tab={tab}>
            <header className="plat-head">
                <div className="plat-title-row">
                    <button type="button" className="plat-back" aria-label="Back" onClick={onBack}>←</button>
                    <div className="plat-title">
                        <h2>Platform</h2>
                        <div className="plat-sub">
                            {([
                                ['offer', 'Offer'],
                                ['network', 'Network'],
                                ['tech', 'Technology'],
                                ['product', 'Product'],
                            ] as [PlatformTab, string][]).map(([id, label], index) => (
                                <React.Fragment key={id}>
                                    {index > 0 ? <i /> : null}
                                    <button type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <button type="button" className="plat-s" aria-label="Brand studio" onClick={onStudio}>$</button>
                </div>
                <div className="plat-stats">
                    {live ? (
                        <>
                            <div className="plat-stat"><span>Peak load</span><b>{peakShown}%</b></div>
                            <div className="plat-stat"><span>Cities</span><b>{citiesShown}</b></div>
                            <div className="plat-stat"><span>Subs</span><b>{formatPeople(state.subscribers)}</b></div>
                        </>
                    ) : (
                        <>
                            <div className="plat-stat"><span>Status</span><b>Setup</b></div>
                            <div className="plat-stat"><span>Subs</span><b>{formatPeople(state.subscribers)}</b></div>
                            <div className="plat-stat"><span>Cities</span><b>{citiesShown} ready</b></div>
                        </>
                    )}
                    <div className="plat-stat"><span>Treasury</span><b>{formatCompact(state.books?.cash || 0)}</b></div>
                    <div className="plat-stat"><span>Playback</span><b>{!live || playback == null ? '—' : `${playShown}%`}</b></div>
                    <div className="plat-stat"><span>Tech debt</span><b>{debtShown}</b></div>
                </div>
                <div className="plat-toolbar">
                    <div className="plat-tabs" role="tablist">
                        {([
                            ['offer', 'Offer'],
                            ['network', 'Network'],
                            ['tech', 'Tech'],
                            ['product', 'Product'],
                            ['status', 'Status'],
                        ] as [PlatformTab, string][]).map(([id, label]) => (
                            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                                {label}
                                {id === 'status' && openIncident ? <i className="dot" /> : null}
                            </button>
                        ))}
                    </div>
                    <span className={`plat-chip ${live ? 'air' : 'wait'}`}>{live ? `Live · Week ${player.currentWeek || 1} · Year ${player.age || 1}` : 'Before launch'}</span>
                    <button type="button" className="plat-chip" data-testid="open-launch-campaign" onClick={() => setLaunchOpen(true)} style={{ cursor: 'pointer', background: '#2f6bff', color: '#fff', borderColor: '#6d8bff' }}>Launch campaign</button>
                </div>
            </header>
            {launchOpen && createPortal(<LaunchCampaign player={player} onPlayer={onPlayer} onClose={() => setLaunchOpen(false)} />, document.body)}
            <div className="plat-body">
                {tab === 'offer' && <OfferTab player={player} onPlayer={onPlayer} onStudio={onStudio} editing={editing} lead={lead} onOpenTech={id => { setTechFocus(id); setTab('tech'); }} />}
                {tab === 'network' && <NetworkTab player={player} onPlayer={onPlayer} />}
                {tab === 'tech' && <TechTab player={player} onPlayer={onPlayer} focusId={techFocus} shot={shot} />}
                {tab === 'product' && <ProductTab player={player} onPlayer={onPlayer} onLaunch={() => setLaunchOpen(true)} />}
                {tab === 'status' && <StatusTab player={player} />}
            </div>
        </div>
    );
};
