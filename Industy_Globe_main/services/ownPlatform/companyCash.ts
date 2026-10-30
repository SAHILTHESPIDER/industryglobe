import { PlatformLedgerLine, Player } from '../../types';

/** Company cash only. Personal money is player.money and is not read here. */
export const readCompanyCash = (player: Player): number => {
    const cash = player.ownPlatform?.books?.cash;
    return Number.isFinite(cash) ? (cash as number) : 0;
};

/** Posts one company-ledger line and moves company cash. Does not touch personal money. */
export const addCompanyCash = (player: Player, amount: number, label: string, source: PlatformLedgerLine['source']): void => {
    const state = player.ownPlatform;
    if (!state) return;
    const safe = Math.trunc(amount);
    if (!safe) return;
    if (!state.books) {
        state.books = {
            funding: 'OWN',
            debt: 0,
            equitySoldPct: 0,
            facilityRate: 0.09,
            pePartner: 'Kestrel Long Fund',
            history: [],
            lines: [],
            cash: 0,
        };
    }
    const books = state.books;
    books.cash = (Number.isFinite(books.cash) ? books.cash : 0) + safe;
    books.lines = [{
        id: `line_${player.currentWeek}_${books.lines.length}_${source}`,
        week: player.currentWeek,
        year: player.age,
        amount: safe,
        label,
        source,
    }, ...books.lines].slice(0, 40);
};
