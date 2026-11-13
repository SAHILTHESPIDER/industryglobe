import React from 'react';
import { Player } from '../../../types';
import { absoluteWeek } from '../../../services/boxOfficeSim';
import '../fonts';
import './localization.css';

export type ContentTab = 'library' | 'rights' | 'slate' | 'localization';

const TABS: [ContentTab, string][] = [
    ['library', 'Library'],
    ['rights', 'Rights'],
    ['slate', 'Slate'],
    ['localization', 'Localization'],
];

interface Props {
    player: Player;
    tab: ContentTab;
    onTab: (tab: ContentTab) => void;
    children: React.ReactNode;
}

export const ContentFrame: React.FC<Props> = ({ player, tab, onTab, children }) => {
    const state = player.ownPlatform;
    const catalogue = state?.catalogue || [];
    const titles = catalogue.length;
    const originals = catalogue.filter(row => row.source === 'OWNED').length;
    const licensed = catalogue.filter(row => row.source === 'LICENCE').length;
    const now = absoluteWeek(player.age || 0, player.currentWeek || 1);
    const expiring = (state?.streamRights?.holdings || []).filter(row => {
        const left = row.expiresAbsolute - now;
        return left > 0 && left <= 8;
    }).length;
    const slateSoon = catalogue.some(row => typeof row.releaseWeekOffset === 'number' && row.releaseWeekOffset > 0 && row.releaseWeekOffset <= 4);
    const initial = (state?.name || 'Empire+').trim().charAt(0).toUpperCase() || 'E';
    return (
        <section className="cdesk" data-testid="content-desk">
            <header className="cdesk-head">
                <div className="cdesk-title-row">
                    <div className="cdesk-title">
                        <h2>Content Desk</h2>
                        <div className="cdesk-sub">Library <i /> Rights <i /> Slate <i /> Languages</div>
                    </div>
                    <div className="cdesk-s" aria-hidden="true">{initial}</div>
                </div>
                <div className="cdesk-stats">
                    <div className="cdesk-stat"><span>Titles</span><b>{titles}</b></div>
                    <div className="cdesk-stat"><span>Originals</span><b>{originals}</b></div>
                    <div className="cdesk-stat"><span>Licensed</span><b>{licensed}</b></div>
                    <div className="cdesk-stat"><span>Expiring</span><b>{expiring}</b></div>
                </div>
                <div className="cdesk-tabs" role="tablist">
                    {TABS.map(([id, label]) => (
                        <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} data-testid={`content-tab-${id}`} onClick={() => onTab(id)}>
                            {label}
                            {id === 'slate' && slateSoon ? <i className="dot" /> : null}
                        </button>
                    ))}
                </div>
            </header>
            <div className="cdesk-body">{children}</div>
        </section>
    );
};
