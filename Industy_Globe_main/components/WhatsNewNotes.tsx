import React, { useState } from 'react';
import { APP_DISPLAY_VERSION } from '../services/appVersion';
import { formatCompact } from '../services/ownPlatform/logic';
import { FOUNDING_CAPITAL_USD } from '../services/ownPlatform/studio';

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
                    Empire+ can speak more languages, sell memberships, and launch in a lot of cities at once.
                </p>
            </div>
            <div className="space-y-3 text-sm">
                <Note
                    tone="gold"
                    kicker="This update"
                    items={[
                        `Founding Empire+ takes ${formatCompact(FOUNDING_CAPITAL_USD)} of your personal cash. The cheque becomes the company treasury. A company you already opened is left as it is.`,
                        'Localization sits on the Content desk. Each region card has a setup cost and a weekly cost. Subtitles and Dubbing each have 3 levels, and each level has 3 steps that spend company energy. Names show in the local script.',
                        'A plan that is switched off no longer changes the price, the ads, or the forecast. The last live plan stays on.',
                        'The Offer desk has membership cards, a compare table, add and remove, ad breaks, and billing periods. It stays locked until the service launches.',
                        'Every plan starts at 480p. A sharper picture is a paid step up the ladder.',
                        'Launch Campaign is six steps, across many cities and many channels. The brand wraps the metro, the bus, the billboards, and the screens.',
                        'Opening night plays on the real landmark. Burj Khalifa wears the lights, Paris gets the Eiffel Tower, Mumbai gets a drone show, plus a fan festival and a stunt show. Results come back city by city.',
                        'Brand studio, the boardroom table, and the ownership papers are in. Colour, logo, and type lock when you launch.',
                        'The marketing desk works for Empire+ and the production house. On a wide screen the phone uses the full desk. A narrow window stays compact.',
                    ]}
                />
                <Note
                    tone="blue"
                    kicker="Fixes"
                    items={[
                        'Found your streamer can be tapped again.',
                        'Add plan no longer sits underneath the compare table.',
                        'The phone video channel button opens the right channel.',
                        'Play and pause work on a video.',
                        'Pre-book is saved, not forgotten when you leave.',
                        'An Instagram profile ring opens that person\'s latest post.',
                    ]}
                />
                <button
                    type="button"
                    onClick={() => setShowEarlier(open => !open)}
                    className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-black px-4 py-3 text-left"
                >
                    <span>
                        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">Earlier notes</span>
                        <span className="mt-1 block text-xs text-zinc-500">1.2.0 and before</span>
                    </span>
                    <span className="text-lg text-zinc-400">{showEarlier ? '−' : '+'}</span>
                </button>
                {showEarlier && (
                    <ul className="space-y-2 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm leading-relaxed text-zinc-400">
                        <li>• 1.2.0 tidied Home, training, Lifestyle, and the phone, and kept Empire+ listing, rights, and stake sales on company cash.</li>
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
