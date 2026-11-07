import React, { useState } from 'react';
import { APP_DISPLAY_VERSION } from '../services/appVersion';

const Note: React.FC<{ kicker: string; tone: 'gold' | 'blue'; items: string[] }> = ({ kicker, tone, items }) => (
    <div className={`rounded-2xl border px-4 py-3 ${tone === 'gold' ? 'border-amber-400/30 bg-amber-400/10' : 'border-blue-400/30 bg-blue-500/10'}`}>
        <div className={`mb-2 text-[10px] font-black uppercase tracking-[0.18em] ${tone === 'gold' ? 'text-amber-200' : 'text-blue-200'}`}>{kicker}</div>
        <ul className="space-y-2 text-sm leading-relaxed text-zinc-200">
            {items.map(item => <li key={item}>• {item}</li>)}
        </ul>
    </div>
);

export const WhatsNewNotes: React.FC = () => {
    const [showEarlier, setShowEarlier] = useState(false);
    return (
        <div data-testid="whats-new">
            <div className="mb-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">What&apos;s New</div>
                <h3 className="text-2xl font-black text-white">Version {APP_DISPLAY_VERSION}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Empire+ can list, buy stories, and close a stake. The production house, training, lifestyle, and phone are easier to read.
                </p>
            </div>
            <div className="space-y-3 text-sm">
                <Note
                    tone="gold"
                    kicker="This update"
                    items={[
                        'Self Improvement keeps Wellbeing, Workshops, and Genre Lab. On a wide screen they sit side by side. On a phone you still switch tabs. Prices, weeks, and energy are the real courses.',
                        'Lifestyle opens on your personal cash. Equity is the value of your companies, not money you can spend. Production, Assets, Business Empire, and Empire+ are the same doors.',
                        'The phone keeps every app. Unread notes show only when a real message is waiting.',
                    ]}
                />
                <Note
                    tone="blue"
                    kicker="Where to find it"
                    items={[
                        'Production House: Lifestyle, then your studio. Gold is studio valuation. Blue is studio capital, the company cash.',
                        'IPO: Phone, Empire+, Operations, then IPO · List company. Eight steps: board meeting, bank, valuation, roadshow, order book, documents, listing day, and the first trading day. The cheque is company cash. Personal cash does not move.',
                        'Rights: Phone, Empire+, the rights floor. Market Floor is where you bid and sit at the negotiation table. Contract Vault holds a title you signed, and how many weeks are left.',
                        'Selling a stake: the same Operations desk. The close is an offer letter, a handshake, the terms, a lawyer stamp, and a final signature. The handshake itself does not move money.',
                    ]}
                />
                <button
                    type="button"
                    onClick={() => setShowEarlier(open => !open)}
                    className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-black px-4 py-3 text-left"
                >
                    <span>
                        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">Earlier notes</span>
                        <span className="mt-1 block text-xs text-zinc-500">1.1.30 and before</span>
                    </span>
                    <span className="text-lg text-zinc-400">{showEarlier ? '−' : '+'}</span>
                </button>
                {showEarlier && (
                    <ul className="space-y-2 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm leading-relaxed text-zinc-400">
                        <li>• 1.1.30 added YouTube play buttons, channel looks, careers that start with no subscribers, and the Partner Program.</li>
                        <li>• 1.1.28 added critic scores, test screenings, and the festival circuit.</li>
                        <li>• 1.1.27 fixed the streaming plan price, filled the weekend Top 10, and tied your X location to the city you live in.</li>
                        <li>• 1.1.25 fixed streaming viewership curves, bid wars, pregnancy logic, and long-career save stability.</li>
                    </ul>
                )}
            </div>
        </div>
    );
};
