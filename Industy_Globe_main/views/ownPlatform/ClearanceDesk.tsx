import React, { useMemo, useState } from 'react';
import { LaunchRegionId, OwnPlatformState, Player } from '../../types';
import { LAUNCH_REGIONS, MARKET_COUNTRIES, getCountry } from '../../services/ownPlatform/catalog';
import {
    CONDITION_COPY,
    conditionMet,
    isStreamingCleared,
    licenceAction,
    formatLicenceUsd,
    licenceQuote,
    regulatorFor,
} from '../../services/ownPlatform/clearance';
import {
    acceptStreamingConditions,
    appealStreamingLicence,
    applyStreamingLicence,
    payStreamingRenewal,
    reapplyStreamingLicence,
} from '../../services/ownPlatform/logic';
import { WorldMarketMap } from './WorldMarketMap';
import { headingFont } from './ui';
import './platform/platform.css';

const PAGE = 8;
const JUMPS = ['US', 'IN', 'CN', 'GB', 'FR', 'BR', 'NZ', 'TV'];

type StatusFilter = 'ALL' | 'NEED' | 'REVIEW' | 'LICENSED' | 'TERMS' | 'REFUSED';

const FILTERS: [StatusFilter, string][] = [
    ['ALL', 'All'],
    ['NEED', 'No licence'],
    ['REVIEW', 'In review'],
    ['TERMS', 'Conditions'],
    ['LICENSED', 'Licensed'],
    ['REFUSED', 'Refused'],
];

export const licenceFill = (state: OwnPlatformState, countryId: string): string | undefined => {
    const application = state.applications.find(row => row.countryId === countryId);
    if (!application) return undefined;
    if (isStreamingCleared(application)) return '#1f8f62';
    if (application.status === 'REJECTED') return '#a33b52';
    if (application.status === 'CONDITIONS') return '#c4842a';
    if (application.status === 'FILED' || application.status === 'DELAYED') return '#c6a15a';
    return undefined;
};

const statusLabel = (state: OwnPlatformState, countryId: string): string => {
    const application = state.applications.find(row => row.countryId === countryId);
    if (!application) return 'No licence';
    if (application.grandfathered && isStreamingCleared(application)) return 'Licensed · existing';
    if (application.status === 'APPROVED') return 'Licensed';
    if (application.status === 'CONDITIONS' && application.acceptedConditions) return 'Licensed · conditions';
    if (application.status === 'CONDITIONS') return 'Conditions requested';
    if (application.status === 'REJECTED') return 'Refused';
    if (application.status === 'DELAYED') return 'Under review';
    return 'Under review';
};

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

export const ClearanceDesk: React.FC<Props> = ({ player, onPlayer }) => {
    const state = player.ownPlatform;
    const [focusId, setFocusId] = useState(state?.selectedCountryIds[0] || 'US');
    const [region, setRegion] = useState<LaunchRegionId | 'ALL'>('ALL');
    const [filter, setFilter] = useState<StatusFilter>('ALL');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [error, setError] = useState('');
    const quotes = useMemo(() => MARKET_COUNTRIES.length, []);

    if (!state) return null;
    const cash = state.books?.cash || 0;
    const focus = getCountry(focusId) || getCountry('US') || MARKET_COUNTRIES[0];
    const profile = regulatorFor(focus.id);
    const quote = licenceQuote(focus.id);
    const action = licenceAction(player, focus.id);
    const application = state.applications.find(row => row.countryId === focus.id);
    const licensed = state.applications.filter(row => isStreamingCleared(row)).length;
    const reviewing = state.applications.filter(row => row.status === 'FILED' || row.status === 'DELAYED').length;

    const pool = MARKET_COUNTRIES.filter(country => {
        if (region !== 'ALL' && country.regionId !== region) return false;
        if (query.trim()) {
            const needle = query.trim().toLowerCase();
            const regulator = regulatorFor(country.id);
            const hay = `${country.name} ${country.id} ${regulator?.name || ''} ${regulator?.short || ''}`.toLowerCase();
            if (!hay.includes(needle)) return false;
        }
        const app = state.applications.find(row => row.countryId === country.id);
        if (filter === 'NEED') return !app;
        if (filter === 'REVIEW') return app?.status === 'FILED' || app?.status === 'DELAYED';
        if (filter === 'LICENSED') return isStreamingCleared(app);
        if (filter === 'TERMS') return app?.status === 'CONDITIONS' && !app.acceptedConditions;
        if (filter === 'REFUSED') return app?.status === 'REJECTED';
        return true;
    });
    const pages = Math.max(1, Math.ceil(pool.length / PAGE));
    const safePage = Math.min(page, pages - 1);
    const visible = pool.slice(safePage * PAGE, safePage * PAGE + PAGE);

    const jump = (id: string) => {
        const country = getCountry(id);
        if (!country) return;
        setFocusId(id);
        setRegion('ALL');
        setFilter('ALL');
        setQuery('');
        const index = MARKET_COUNTRIES.findIndex(row => row.id === id);
        setPage(Math.floor(Math.max(0, index) / PAGE));
        setError('');
    };

    const run = (result: { player: Player; error?: string }) => {
        if (result.error) setError(result.error);
        else setError('');
        if (result.player !== player) onPlayer(result.player);
    };

    const press = () => {
        if (action.kind === 'APPLY') run(applyStreamingLicence(player, focus.id));
        else if (action.kind === 'REAPPLY') run(reapplyStreamingLicence(player, focus.id));
        else if (action.kind === 'ACCEPT') run(acceptStreamingConditions(player, focus.id));
        else if (action.kind === 'RENEW') run(payStreamingRenewal(player, focus.id));
    };

    const pressSecondary = () => {
        if (action.secondary?.kind === 'APPEAL') run(appealStreamingLicence(player, focus.id));
        if (action.secondary?.kind === 'REAPPLY') run(reapplyStreamingLicence(player, focus.id));
    };

    const applySlate = () => {
        let current = player;
        let firstError = '';
        let paid = 0;
        state.selectedCountryIds.forEach(id => {
            if (licenceAction(current, id).kind !== 'APPLY') return;
            const result = applyStreamingLicence(current, id);
            if (result.error) {
                if (!firstError) firstError = result.error;
                return;
            }
            current = result.player;
            paid += 1;
        });
        setError(paid && firstError ? `${firstError} ${paid} other ${paid === 1 ? 'file was' : 'files were'} paid.` : firstError);
        if (current !== player) onPlayer(current);
    };

    const payable = action.kind === 'APPLY' || action.kind === 'REAPPLY' || action.kind === 'RENEW';

    return (
        <section className="clearance" data-testid="clearance-desk">
            <div className="clear-top">
                <div className="plat-kicker">Government clearance</div>
                <h3 style={{ fontFamily: headingFont }}>A licence in every country</h3>
                <p>Each market has its own regulator and its own fee, taken from that country’s audience, prices, and population. The cheque leaves the company treasury when you apply. Nothing streams there until that licence is granted. A neighbour’s permit does not travel.</p>
            </div>
            <div className="clear-stats">
                <div><span>Treasury</span><b data-testid="clearance-treasury">{formatLicenceUsd(cash)}</b></div>
                <div><span>Licensed</span><b>{licensed}</b></div>
                <div><span>In review</span><b>{reviewing}</b></div>
                <div><span>Markets</span><b>{quotes}</b></div>
            </div>
            <WorldMarketMap
                selectedIds={state.selectedCountryIds}
                focusId={focus.id}
                onPick={jump}
                fillId={id => licenceFill(state, id)}
                legend="Each colour is that country’s own file. Click a country to open its card."
            />
            <div className="clear-jumps" aria-label="Large and small markets">
                {JUMPS.map(id => {
                    const country = getCountry(id);
                    const row = licenceQuote(id);
                    if (!country || !row) return null;
                    return (
                        <button key={id} type="button" className={focus.id === id ? 'on' : ''} onClick={() => jump(id)}>
                            <b>{country.flag} {country.name}</b>
                            <span>{formatLicenceUsd(row.feeUsd)}</span>
                        </button>
                    );
                })}
            </div>
            <div className="clear-layout">
                <div className="clear-list">
                    <div className="clear-tools">
                        <input
                            value={query}
                            onChange={event => { setQuery(event.target.value); setPage(0); }}
                            placeholder="Search a country or regulator"
                            aria-label="Search countries"
                        />
                        <button type="button" className="clear-btn ghost" onClick={applySlate}>Apply for the slate</button>
                    </div>
                    <div className="clear-filters" role="tablist">
                        <button type="button" className={region === 'ALL' ? 'on' : ''} onClick={() => { setRegion('ALL'); setPage(0); }}>World</button>
                        {LAUNCH_REGIONS.map(row => (
                            <button key={row.id} type="button" className={region === row.id ? 'on' : ''} onClick={() => { setRegion(row.id); setPage(0); }}>{row.short}</button>
                        ))}
                    </div>
                    <div className="clear-filters">
                        {FILTERS.map(([id, label]) => (
                            <button key={id} type="button" className={filter === id ? 'on' : ''} onClick={() => { setFilter(id); setPage(0); }}>{label}</button>
                        ))}
                    </div>
                    <div className="clear-cards">
                        {visible.map(country => {
                            const row = licenceQuote(country.id);
                            const regulator = regulatorFor(country.id);
                            const app = state.applications.find(item => item.countryId === country.id);
                            return (
                                <button
                                    key={country.id}
                                    type="button"
                                    className={`clear-card ${country.id === focus.id ? 'on' : ''}`}
                                    data-testid={`clearance-card-${country.id}`}
                                    onClick={() => { setFocusId(country.id); setError(''); }}
                                >
                                    <div className="clear-card-top">
                                        <b>{country.flag} {country.name}</b>
                                        <em>{statusLabel(state, country.id)}</em>
                                    </div>
                                    <span>{regulator?.short}</span>
                                    <strong>{row ? formatLicenceUsd(row.feeUsd) : '—'}</strong>
                                    {(app?.status === 'FILED' || app?.status === 'DELAYED') && <small>{app.weeksLeft} weeks left</small>}
                                </button>
                            );
                        })}
                        {visible.length === 0 && <p className="clear-empty">No country matches. The map still has every market.</p>}
                    </div>
                    <div className="clear-page">
                        <span>{pool.length} shown · page {safePage + 1} of {pages}</span>
                        <span>
                            <button type="button" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}>Previous</button>
                            <button type="button" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Next</button>
                        </span>
                    </div>
                </div>
                {profile && quote && (
                    <aside className="clear-detail" data-testid="clearance-detail">
                        <div className="plat-kicker">{profile.short}</div>
                        <h3 style={{ fontFamily: headingFont }}>{focus.flag} {focus.name}</h3>
                        <p className="clear-statute">{profile.statute}</p>
                        <p className="clear-regulator">{profile.name}</p>
                        <div className="clear-facts">
                            <div><span>Status</span><b data-testid="clearance-status">{statusLabel(state, focus.id)}</b></div>
                            <div><span>Market value</span><b>{formatLicenceUsd(quote.marketValueUsd)}</b></div>
                            <div><span>Licence fee</span><b data-testid="clearance-fee">{formatLicenceUsd(quote.feeUsd)}</b></div>
                            <div><span>Annual renewal</span><b>{formatLicenceUsd(application?.renewalUsd || quote.renewalUsd)}</b></div>
                            <div><span>Review</span><b>{quote.reviewWeeks} weeks</b></div>
                            <div><span>Weeks left</span><b>{application && (application.status === 'FILED' || application.status === 'DELAYED') ? application.weeksLeft : '—'}</b></div>
                        </div>
                        {application?.note && <p className="clear-note">{application.note}</p>}
                        {application?.grandfathered && <p className="clear-note">This market was already open. The licence was written in without a cheque.</p>}
                        <div className="clear-conditions">
                            <span>Conditions</span>
                            {profile.conditions.length === 0 && <p>No extra conditions. A clean approval is the fee and the wait.</p>}
                            {(application?.conditions?.length ? application.conditions : profile.conditions).map(kind => {
                                const copy = CONDITION_COPY[kind];
                                const attached = Boolean(application?.conditions?.includes(kind));
                                const met = attached && conditionMet(state, focus.id, kind);
                                return (
                                    <div key={kind}>
                                        <b>{copy.title}{attached ? (met ? ' · met' : ' · open') : ''}</b>
                                        <p>{attached ? (met ? copy.met : copy.unmet) : `The regulator can ask for this. ${copy.unmet}`}</p>
                                    </div>
                                );
                            })}
                        </div>
                        {payable && action.missing > 0 && (
                            <p className="clear-short" data-testid="clearance-missing">
                                The treasury has {formatLicenceUsd(cash)}. This cheque is {formatLicenceUsd(action.cost)}. Short by {formatLicenceUsd(action.missing)}.
                            </p>
                        )}
                        <div className="clear-actions">
                            {(action.kind === 'APPLY' || action.kind === 'REAPPLY' || action.kind === 'ACCEPT' || action.kind === 'RENEW') && (
                                <button
                                    type="button"
                                    className="clear-btn pri"
                                    data-testid="clearance-apply"
                                    disabled={action.missing > 0}
                                    onClick={press}
                                >
                                    {action.label}
                                    {action.cost > 0 ? ` · ${formatLicenceUsd(action.cost)}` : ''}
                                </button>
                            )}
                            {action.secondary && (
                                <button
                                    type="button"
                                    className="clear-btn gold"
                                    data-testid="clearance-appeal"
                                    disabled={!action.secondary.enabled}
                                    onClick={pressSecondary}
                                >
                                    {action.secondary.label} · {formatLicenceUsd(action.secondary.cost)}
                                </button>
                            )}
                            {action.kind === 'WAIT' && <p className="clear-wait">{action.detail}</p>}
                        </div>
                        {action.secondary && action.secondary.missing > 0 && (
                            <p className="clear-short">Appeal is short by {formatLicenceUsd(action.secondary.missing)}.</p>
                        )}
                        {error && <p className="clear-error" role="alert">{error}</p>}
                    </aside>
                )}
            </div>
        </section>
    );
};
