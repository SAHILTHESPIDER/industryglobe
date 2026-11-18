import React, { useEffect, useState } from 'react';

type Kind = 'blank' | 'title' | 'byline' | 'trans' | 'slug' | 'name' | 'paren' | 'dialogue' | 'action' | 'song';

const kindOf = (line: string, afterName: boolean): Kind => {
    const text = line.trim();
    if (!text) return 'blank';
    if (text.startsWith('INT.') || text.startsWith('EXT.') || text.startsWith('INT/EXT.')) return 'slug';
    if (text === 'FADE IN:' || text === 'FADE OUT.' || text === 'THE END' || text.startsWith('CUT TO')) return 'trans';
    if (text.startsWith('SONG:')) return 'song';
    if (text.startsWith('(') && text.endsWith(')')) return 'paren';
    if (text.startsWith('by ')) return 'byline';
    if (text === text.toUpperCase() && text.length < 42 && !text.includes('.') && !/[a-z]/.test(text)) return afterName ? 'dialogue' : 'name';
    return 'action';
};

const classify = (text: string) => {
    const lines = text.split('\n');
    let afterName = false;
    let titled = false;
    return lines.map(line => {
        let kind = kindOf(line, afterName);
        if (!titled && kind === 'name') {
            kind = 'title';
            titled = true;
        }
        afterName = kind === 'name' || kind === 'paren' || (afterName && kind === 'dialogue');
        return { kind, text: line.trim() };
    });
};

export const ScreenplayPage: React.FC<{ text: string; live?: boolean }> = ({ text, live = true }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!live || reduce) {
            setCount(text.length);
            return;
        }
        setCount(0);
        let shown = 0;
        const timer = window.setInterval(() => {
            shown = Math.min(text.length, shown + 4);
            setCount(shown);
            if (shown >= text.length) window.clearInterval(timer);
        }, 16);
        return () => window.clearInterval(timer);
    }, [text, live]);

    const rows = classify(text.slice(0, count));
    const typing = count < text.length;

    return (
        <div data-testid="screenplay-page" className="mx-auto w-full max-w-[420px] bg-[#f6f1e6] text-[#1a1a1a] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-5 py-8 sm:px-8" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
            <div className="mb-6 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#8a8172]">
                <span>Page 1</span>
                <span>{typing ? 'Typing' : 'Locked pages'}</span>
            </div>
            <div className="space-y-0 text-[13px] leading-6">
                {rows.map((row, index) => {
                    if (row.kind === 'blank') return <div key={index} className="h-3" />;
                    if (row.kind === 'title') return <h3 key={index} className="mb-1 text-center text-[15px] font-bold tracking-wide">{row.text}</h3>;
                    if (row.kind === 'byline') return <p key={index} className="mb-4 text-center text-[12px] italic">{row.text}</p>;
                    if (row.kind === 'trans') return <p key={index} className="my-3 text-center font-bold">{row.text}</p>;
                    if (row.kind === 'slug') return <p key={index} className="mt-4 font-bold">{row.text}</p>;
                    if (row.kind === 'song') return <p key={index} className="my-3 text-center font-bold">{row.text}</p>;
                    if (row.kind === 'name') return <p key={index} className="mt-3 text-center font-bold tracking-wide">{row.text}</p>;
                    if (row.kind === 'paren') return <p key={index} className="text-center">{row.text}</p>;
                    if (row.kind === 'dialogue') return <p key={index} className="mx-auto max-w-[15rem] text-center">{row.text}</p>;
                    return <p key={index}>{row.text}</p>;
                })}
                {typing && <span className="inline-block h-4 w-2 translate-y-0.5 bg-black align-middle" />}
            </div>
        </div>
    );
};
