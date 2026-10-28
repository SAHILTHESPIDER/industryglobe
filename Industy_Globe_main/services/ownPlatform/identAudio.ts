/**
 * Original stings synthesized in the browser. No samples, no copyrighted ta-dum.
 * Each style gets its own rhythm so the bumper is recognizable with the picture off.
 */

type OscKind = OscillatorType;

let shared: AudioContext | null = null;

const context = (): AudioContext | null => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!shared) shared = new AudioCtx();
    if (shared.state === 'suspended') void shared.resume();
    return shared;
};

const tone = (
    ctx: AudioContext,
    dest: AudioNode,
    start: number,
    dur: number,
    freq: number,
    type: OscKind,
    peak: number,
    freqTo?: number,
) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), start);
    if (freqTo && freqTo > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), start + dur);
    const attack = Math.min(0.08, Math.max(0.012, dur * 0.18));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.05);
};

const noise = (ctx: AudioContext, dest: AudioNode, start: number, dur: number, peak: number, cutoff: number) => {
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
        const fade = 1 - index / data.length;
        data[index] = (Math.random() * 2 - 1) * fade * fade;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, peak), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(start);
    source.stop(start + dur + 0.02);
};

const schedule = (styleId: string, ctx: AudioContext, dest: AudioNode, t: number) => {
    switch (styleId) {
        case 'signal':
            noise(ctx, dest, t, 0.16, 0.55, 180);
            tone(ctx, dest, t, 0.42, 146, 'sine', 0.22, 78);
            tone(ctx, dest, t + 0.14, 0.7, 196, 'triangle', 0.14);
            tone(ctx, dest, t + 0.2, 0.55, 294, 'sine', 0.07);
            return;
        case 'marquee':
            [262, 330, 392, 523].forEach((freq, index) => {
                tone(ctx, dest, t + index * 0.16, 0.38, freq, 'sawtooth', 0.07);
                tone(ctx, dest, t + index * 0.16, 0.38, freq / 2, 'triangle', 0.05);
            });
            return;
        case 'noir':
            tone(ctx, dest, t, 1.15, 98, 'triangle', 0.12, 87);
            tone(ctx, dest, t + 0.35, 0.9, 116, 'sine', 0.06);
            noise(ctx, dest, t, 0.9, 0.08, 400);
            return;
        case 'pulse':
            [0, 0.28, 0.56].forEach((offset) => noise(ctx, dest, t + offset, 0.12, 0.4, 120));
            tone(ctx, dest, t, 0.7, 180, 'square', 0.05, 720);
            tone(ctx, dest, t + 0.56, 0.28, 440, 'square', 0.06);
            return;
        case 'atlas':
            tone(ctx, dest, t, 1.25, 196, 'sine', 0.08);
            tone(ctx, dest, t + 0.05, 1.2, 198, 'sine', 0.05);
            tone(ctx, dest, t + 0.12, 1.15, 294, 'triangle', 0.05);
            return;
        case 'hearth':
            [174, 220, 261].forEach((freq, index) => tone(ctx, dest, t + index * 0.06, 1.15, freq, 'sine', 0.07));
            tone(ctx, dest, t + 0.2, 0.8, 349, 'triangle', 0.035);
            return;
        case 'voltage':
            [659, 784, 988, 1318, 988, 784].forEach((freq, index) => tone(ctx, dest, t + index * 0.07, 0.12, freq, 'square', 0.045));
            noise(ctx, dest, t + 0.42, 0.08, 0.25, 2400);
            return;
        case 'linen':
            [523, 784, 1046].forEach((freq, index) => tone(ctx, dest, t + index * 0.22, 1.05, freq, 'sine', 0.045));
            tone(ctx, dest, t + 0.15, 1.1, 1568, 'triangle', 0.02);
            return;
        default:
            tone(ctx, dest, t, 0.45, 440, 'sine', 0.08);
    }
};

export const playIdentSting = (styleId: string) => {
    const ctx = context();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.85, ctx.currentTime);
    master.connect(ctx.destination);
    const start = ctx.currentTime + 0.02;
    schedule(styleId, ctx, master, start);
    master.gain.setValueAtTime(0.85, start + 1.15);
    master.gain.exponentialRampToValueAtTime(0.0001, start + 1.45);
    window.setTimeout(() => master.disconnect(), 1800);
};
