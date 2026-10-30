/**
 * Original stings synthesized in the browser, plus a short mono WAV from an upload.
 * No samples and no copyrighted ta-dum. Each ident has its own rhythm.
 */

type OscKind = OscillatorType;

let shared: AudioContext | null = null;
let generation = 0;
let liveOscillators: OscillatorNode[] = [];
let liveSources: AudioBufferSourceNode[] = [];

const context = (): AudioContext | null => {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        if (!shared || shared.state === 'closed') shared = new AudioCtx();
        if (shared.state === 'suspended') void shared.resume().catch(() => undefined);
        return shared;
    } catch {
        return null;
    }
};

const silence = () => {
    liveOscillators.forEach(node => { try { node.stop(); } catch { /* already stopped */ } });
    liveSources.forEach(node => { try { node.stop(); } catch { /* already stopped */ } });
    liveOscillators = [];
    liveSources = [];
};

export const stopIdent = (): void => {
    generation += 1;
    silence();
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
    osc.frequency.setValueAtTime(Math.max(40, freq), start);
    if (freqTo && freqTo > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), start + dur);
    const attack = Math.min(0.06, Math.max(0.01, dur * 0.16));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(dur, attack + 0.02));
    osc.connect(gain);
    gain.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.05);
    liveOscillators.push(osc);
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
    liveSources.push(source);
};

const schedule = (id: string, ctx: AudioContext, dest: AudioNode, t: number) => {
    switch (id) {
        case 'pulse':
            tone(ctx, dest, t, 0.18, 82, 'sine', 0.2);
            tone(ctx, dest, t + 0.34, 0.22, 82, 'sine', 0.16);
            tone(ctx, dest, t, 0.7, 164, 'triangle', 0.05);
            return;
        case 'ascent':
            [196, 247, 294, 392].forEach((freq, index) => tone(ctx, dest, t + index * 0.16, 0.34, freq, 'triangle', 0.1));
            return;
        case 'premiere':
            noise(ctx, dest, t, 0.12, 0.35, 240);
            [262, 330, 392, 523].forEach((freq, index) => tone(ctx, dest, t + 0.08 + index * 0.11, 0.4, freq, 'sawtooth', 0.05));
            tone(ctx, dest, t + 0.5, 0.55, 130, 'triangle', 0.12);
            return;
        case 'choir':
            [196, 247, 294, 392].forEach(freq => tone(ctx, dest, t + 0.05, 1.05, freq, 'sine', 0.06));
            tone(ctx, dest, t, 1.1, 98, 'triangle', 0.08);
            return;
        case 'machine':
            for (let index = 0; index < 8; index += 1) {
                tone(ctx, dest, t + index * 0.11, 0.06, index % 2 ? 880 : 440, 'square', 0.04);
            }
            tone(ctx, dest, t, 0.9, 110, 'sine', 0.08);
            return;
        case 'spark':
            noise(ctx, dest, t, 0.08, 0.4, 2400);
            tone(ctx, dest, t, 0.22, 880, 'square', 0.06, 1760);
            tone(ctx, dest, t + 0.16, 0.35, 1320, 'sine', 0.05);
            return;
        case 'impact':
            noise(ctx, dest, t, 0.2, 0.5, 180);
            tone(ctx, dest, t, 0.7, 55, 'sine', 0.22, 40);
            tone(ctx, dest, t + 0.05, 0.4, 110, 'triangle', 0.08);
            return;
        case 'orbit':
            tone(ctx, dest, t, 1.1, 220, 'sine', 0.07, 330);
            tone(ctx, dest, t + 0.15, 0.95, 330, 'sine', 0.05, 220);
            tone(ctx, dest, t, 1.1, 110, 'triangle', 0.06);
            return;
        case 'bloom':
            tone(ctx, dest, t, 1.2, 174, 'sine', 0.04, 349);
            tone(ctx, dest, t + 0.25, 1, 220, 'triangle', 0.06);
            tone(ctx, dest, t + 0.5, 0.8, 277, 'sine', 0.05);
            return;
        case 'prism':
            [523, 659, 784, 988].forEach((freq, index) => tone(ctx, dest, t + index * 0.07, 0.55, freq, 'sine', 0.045));
            tone(ctx, dest, t, 0.7, 131, 'triangle', 0.06);
            return;
        case 'ember':
            noise(ctx, dest, t, 0.5, 0.08, 900);
            tone(ctx, dest, t, 0.9, 146, 'triangle', 0.1, 110);
            tone(ctx, dest, t + 0.2, 0.7, 220, 'sine', 0.05);
            return;
        case 'signal':
            tone(ctx, dest, t, 0.16, 880, 'sine', 0.08);
            tone(ctx, dest, t + 0.2, 0.7, 440, 'triangle', 0.1);
            tone(ctx, dest, t + 0.2, 0.7, 220, 'sine', 0.06);
            return;
        case 'horizon':
            tone(ctx, dest, t, 1.15, 98, 'sine', 0.1);
            tone(ctx, dest, t + 0.1, 1.05, 147, 'triangle', 0.05);
            tone(ctx, dest, t + 0.3, 0.8, 196, 'sine', 0.04);
            return;
        case 'analog':
            noise(ctx, dest, t, 0.9, 0.06, 1200);
            tone(ctx, dest, t, 0.85, 174, 'triangle', 0.1, 156);
            tone(ctx, dest, t + 0.12, 0.5, 349, 'sine', 0.04);
            return;
        default:
            tone(ctx, dest, t, 0.4, 440, 'sine', 0.1);
    }
};

/** Play one of the fourteen idents. A click is the user gesture. */
export const playIdent = (id: string): void => {
    const ctx = context();
    if (!ctx) return;
    stopIdent();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    schedule(id, ctx, master, ctx.currentTime + 0.02);
};

const writeString = (view: DataView, offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
};

const encodeWav = (samples: Float32Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let index = 0; index < samples.length; index += 1) {
        const clamped = Math.max(-1, Math.min(1, samples[index]));
        view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
        offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
};

const CLIP_SECONDS = 2.8;
const CLIP_RATE = 22050;

/** Trim an upload to a short mono WAV the bumper can play back. */
export const clipToMonoWav = async (file: File): Promise<Blob> => {
    const ctx = context();
    if (!ctx) throw new Error('This browser cannot play the bumper.');
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const frames = Math.max(1, Math.min(decoded.length, Math.floor(decoded.sampleRate * CLIP_SECONDS)));
    const outFrames = Math.max(1, Math.ceil(frames * CLIP_RATE / decoded.sampleRate));
    const offline = new OfflineAudioContext(1, outFrames, CLIP_RATE);
    const clip = offline.createBuffer(decoded.numberOfChannels, frames, decoded.sampleRate);
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
        clip.getChannelData(channel).set(decoded.getChannelData(channel).subarray(0, frames));
    }
    const source = offline.createBufferSource();
    source.buffer = clip;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), CLIP_RATE);
};

export const playWavBlob = async (blob: Blob): Promise<void> => {
    const ctx = context();
    if (!ctx) return;
    stopIdent();
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const source = ctx.createBufferSource();
    source.buffer = audio;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    source.connect(gain);
    gain.connect(ctx.destination);
    liveSources.push(source);
    source.start();
};
