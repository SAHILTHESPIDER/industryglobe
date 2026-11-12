import React, { useMemo, useState } from 'react';
import { ExecCandidate, Player } from '../../types';
import { formatCompact, quoteLaunch } from '../../services/ownPlatform/logic';
import { quoteValuation } from '../../services/ownPlatform/studio';
import {
    HireTerms,
    RENEW_WEEKS,
    annualOf,
    candidateSlate,
    flagForCountry,
    readOffer,
    releaseExecutive,
    renewContract,
    roleEffect,
    roleLabel,
    signContract,
    stakeRoom,
    weeksLeft,
} from '../../services/ownPlatform/executives';
import { CartoonAvatar } from './CartoonFace';

export type HirePane = 'list' | 'dossier' | 'contract' | 'renew' | 'stake';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    pane: HirePane;
    onPane?: (pane: HirePane) => void;
    onClose?: () => void;
}

const Stepper: React.FC<{ label: string; value: string; onDown: () => void; onUp: () => void }> = ({ label, value, onDown, onUp }) => (
    <div className="nego-step">
        <span>{label}</span>
        <div>
            <button type="button" onClick={onDown} aria-label={`Lower ${label}`}>−</button>
            <b>{value}</b>
            <button type="button" onClick={onUp} aria-label={`Raise ${label}`}>+</button>
        </div>
    </div>
);

const Dossier: React.FC<{ candidate: ExecCandidate; onContract: () => void }> = ({ candidate, onContract }) => (
    <article className="cv" data-screen="exec-dossier">
        <header>
            <CartoonAvatar face={candidate.face} size={96} label={candidate.name} />
            <div>
                <div className="lab">{roleLabel(candidate.role)} · {flagForCountry(candidate.country)} {candidate.country}</div>
                <h3 className="h3">{candidate.name}</h3>
                <p className="small">{candidate.city} · {candidate.totalYears} years · {candidate.trait}</p>
            </div>
        </header>
        <div className="lab">Previous houses</div>
        <ul className="cv-posts">
            {candidate.posts.map(post => (
                <li key={`${post.company}-${post.title}`}>
                    <b>{post.company}</b>
                    <span>{post.title}</span>
                    <em>{post.years} yrs</em>
                </li>
            ))}
        </ul>
        <div className="lab">Notable</div>
        {candidate.achievements.map(line => <p key={line} className="small cv-win">{line}</p>)}
        <p className="tiny">{roleEffect(candidate.role)} They ask {formatCompact(candidate.annualAsk)} a year.</p>
        <button type="button" className="btn pri" onClick={onContract}>Open the contract</button>
    </article>
);

const Negotiate: React.FC<{
    player: Player;
    onPlayer: (next: Player) => void;
    candidate: ExecCandidate;
    renewId?: string;
    stakeFirst?: boolean;
}> = ({ player, onPlayer, candidate, renewId, stakeFirst }) => {
    const ask = candidate.annualAsk;
    const [salary, setSalary] = useState(ask);
    const [years, setYears] = useState(2);
    const [bonus, setBonus] = useState(0);
    const [stake, setStake] = useState(stakeFirst ? 0.02 : 0);
    const [buyBack, setBuyBack] = useState(false);
    const [note, setNote] = useState('');
    const [paper, setPaper] = useState(false);
    const room = stakeRoom(player, renewId);
    const held = player.ownPlatform?.boardTeam?.executives.find(row => row.id === renewId)?.stakePct || 0;
    const terms: HireTerms = { annualSalary: salary, termYears: years, signingBonus: bonus, stakePct: stake };
    const offer = readOffer(candidate, terms);
    const cashInterest = Math.round(Math.min(100, (salary / ask) * 70 + (bonus > 0 ? 15 : 0) + years * 4));
    const stakeInterest = Math.round(candidate.stakeAppetite * Math.min(1, stake / 0.05) * 100);
    const due = bonus + Math.round(salary / 52);
    const buyPrice = Math.round(quoteValuation(player) * held);
    const send = () => {
        if (offer.verdict === 'COUNTER' && offer.counter) {
            setSalary(offer.counter.annualSalary);
            setYears(offer.counter.termYears);
            setNote(`${candidate.name} counters: ${formatCompact(offer.counter.annualSalary)} a year for ${offer.counter.termYears} years.`);
            return;
        }
        if (offer.verdict === 'WALK') {
            setNote(`${candidate.name} will not sign this. Raise the pay, the term, or the stake.`);
            return;
        }
        const result = renewId
            ? renewContract(player, renewId, terms, buyBack, buyPrice)
            : signContract(player, candidate.id, terms);
        setNote(result.error || (stake > 0 ? 'Signed. A share certificate is on the table.' : 'Signed. The salary leaves company cash.'));
        if (!result.error) {
            setPaper(stake > 0);
            onPlayer(result.player);
        }
    };
    return (
        <article className={`nego${stakeFirst ? ' stake-focus' : ''}`} data-screen={renewId ? 'exec-renew' : stakeFirst ? 'exec-stake' : 'exec-contract'}>
            <header>
                <CartoonAvatar face={candidate.face} size={72} label={candidate.name} />
                <div>
                    <div className="lab">{renewId ? 'Renewal' : 'Contract'} · {roleLabel(candidate.role)}</div>
                    <h3 className="h3">{candidate.name}</h3>
                    <p className="small">{flagForCountry(candidate.country)} {candidate.country} · asks {formatCompact(ask)} / year</p>
                </div>
            </header>
            <Stepper label="Salary / year" value={formatCompact(salary)} onDown={() => setSalary(value => Math.max(50_000, value - 50_000))} onUp={() => setSalary(value => value + 50_000)} />
            <Stepper label="Years" value={String(years)} onDown={() => setYears(value => Math.max(1, value - 1))} onUp={() => setYears(value => Math.min(5, value + 1))} />
            <Stepper label="Signing bonus" value={bonus ? formatCompact(bonus) : 'None'} onDown={() => setBonus(value => Math.max(0, value - 50_000))} onUp={() => setBonus(value => value + 50_000)} />
            <Stepper label="Stake" value={stake ? `${Math.round(stake * 1000) / 10}%` : 'None'} onDown={() => setStake(value => Math.max(0, Math.round((value - 0.005) * 1000) / 1000))} onUp={() => setStake(value => Math.min(room, Math.round((value + 0.005) * 1000) / 1000))} />
            <div className="accept" aria-label={`Acceptance ${Math.round(offer.chance * 100)} percent`}>
                <div className="lab">Will they sign</div>
                <div className="accept-track"><i style={{ width: `${Math.round(offer.chance * 100)}%` }} /></div>
                <b>{Math.round(offer.chance * 100)}% · {offer.verdict === 'SIGN' ? 'They will sign' : offer.verdict === 'COUNTER' ? 'They will counter' : 'They will walk'}</b>
            </div>
            <div className="interest-pair">
                <div>
                    <span>Cash interest</span>
                    <div className="accept-track"><i style={{ width: `${cashInterest}%` }} /></div>
                </div>
                <div>
                    <span>Stake interest</span>
                    <div className="accept-track gold"><i style={{ width: `${stakeInterest}%` }} /></div>
                </div>
            </div>
            <p className="tiny">Due now from company cash: {formatCompact(due)}. Stake left you can give without losing control: {Math.round(room * 1000) / 10} points.</p>
            {renewId && held > 0 && (
                <label className="buyback">
                    <input type="checkbox" checked={buyBack} onChange={event => setBuyBack(event.target.checked)} />
                    Buy back their {Math.round(held * 1000) / 10}% for {formatCompact(buyPrice)}
                </label>
            )}
            {stake > 0 && (
                <div className={`mini-paper${paper ? ' sealed' : ''}`} data-screen="exec-stake-paper">
                    <div className="lab">Share certificate</div>
                    <strong>{candidate.name}</strong>
                    <div>{Math.round(stake * 1000) / 10}% of the company</div>
                    <p>The founder’s slice shrinks by the same amount. Every name on the table still sums to 100.</p>
                    {paper && <b className="seal-word">Sealed</b>}
                </div>
            )}
            {note && <p className="small">{note}</p>}
            <div className="nego-actions">
                <button type="button" className="btn pri" onClick={send}>{offer.verdict === 'COUNTER' ? 'Hear the counter' : renewId ? 'Renew' : 'Sign'}</button>
                {renewId && (
                    <button type="button" className="btn gho" onClick={() => {
                        const result = releaseExecutive(player, renewId);
                        setNote(result.error || `${candidate.name} left the chair. The weekly salary stops.`);
                        if (!result.error) onPlayer(result.player);
                    }}>Let them go</button>
                )}
            </div>
            <p className="tiny">This week’s forecast burn is {formatCompact(quoteLaunch(player).weeklyBurn)}. The salary is extra, from company cash.</p>
        </article>
    );
};

/** CV, the contract sheet, a renewal, and an optional stake. */
export const HireFlow: React.FC<Props> = ({ player, onPlayer, pane, onPane, onClose }) => {
    const slate = useMemo(() => candidateSlate(player), [player]);
    const [pickId, setPickId] = useState(slate.find(row => row.role === 'CFO')?.id || slate[0]?.id || '');
    const candidate = slate.find(row => row.id === pickId) || slate[0];
    const expiring = (player.ownPlatform?.boardTeam?.executives || []).filter(exec => weeksLeft(player, exec) <= RENEW_WEEKS);
    const renewExec = expiring[0] || player.ownPlatform?.boardTeam?.executives[0];
    const renewAsCandidate: ExecCandidate | undefined = renewExec ? {
        ...renewExec,
        annualAsk: annualOf(renewExec),
        stakeAppetite: 0.45,
        posts: renewExec.posts || [],
        achievements: renewExec.achievements || [],
        totalYears: renewExec.totalYears || 0,
    } : undefined;
    const go = (next: HirePane) => onPane?.(next);
    return (
        <div className="hire-flow">
            <div className="between">
                <div>
                    <div className="lab">Hire</div>
                    <div className="h3">{pane === 'renew' ? 'Contract ending' : pane === 'dossier' ? 'Dossier' : pane === 'stake' ? 'Stake offer' : pane === 'contract' ? 'The contract' : 'Global officers'}</div>
                </div>
                {onClose && <button type="button" className="btn gho sm" onClick={onClose}>Close</button>}
            </div>
            {pane === 'list' && (
                <div className="hire-list">
                    {slate.filter(row => !(player.ownPlatform?.boardTeam?.executives || []).some(exec => exec.role === row.role)).slice(0, 6).map(row => (
                        <article key={row.id} className="hire-card">
                            <CartoonAvatar face={row.face} size={72} label={row.name} />
                            <div>
                                <strong>{row.name}</strong>
                                <div className="small">{flagForCountry(row.country)} {row.country} · {roleLabel(row.role)} · {row.totalYears} yrs</div>
                            </div>
                            <button type="button" className="btn pri sm" onClick={() => { setPickId(row.id); go('dossier'); }}>CV</button>
                        </article>
                    ))}
                </div>
            )}
            {pane === 'dossier' && candidate && <Dossier candidate={candidate} onContract={() => go('contract')} />}
            {(pane === 'contract' || pane === 'stake') && candidate && (
                <Negotiate player={player} onPlayer={onPlayer} candidate={candidate} stakeFirst={pane === 'stake'} />
            )}
            {pane === 'renew' && renewAsCandidate && renewExec && (
                <div data-screen="exec-renew-prompt">
                    <p className="renew-banner">{renewExec.name} has {Math.max(0, weeksLeft(player, renewExec))} weeks left. Renew, or the chair goes empty.</p>
                    <Negotiate player={player} onPlayer={onPlayer} candidate={renewAsCandidate} renewId={renewExec.id} />
                </div>
            )}
        </div>
    );
};
