import React, { useState } from 'react';
import { OwnPlatformState, Player } from '../../types';
import { IDENTS, identById, identLine } from '../../services/ownPlatform/identEffects';
import { clipToMonoWav, playIdent, playWavBlob } from '../../services/ownPlatform/identAudio';
import { loadMediaBlob, saveMediaBlob } from '../../services/mediaStorage';
import { Card, headingFont } from './ui';

interface Props {
    player: Player;
    state: OwnPlatformState;
    locked: boolean;
    onChange: (next: OwnPlatformState) => void;
}

export const IdentPicker: React.FC<Props> = ({ player, state, locked, onChange }) => {
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const selected = identById(state.identId);

    const playSaved = async () => {
        if (!state.customAudioMediaId) return;
        const blob = await loadMediaBlob(state.customAudioMediaId);
        if (!blob) {
            setError('The saved clip is missing from this browser. Upload it again.');
            return;
        }
        await playWavBlob(blob);
    };

    const onFile = async (file: File | undefined) => {
        if (!file || locked) return;
        setError('');
        if (file.size > 12_000_000) {
            setError('That file is over 12MB. Use a shorter recording.');
            return;
        }
        setBusy(true);
        try {
            const wav = await clipToMonoWav(file);
            const meta = await saveMediaBlob(`own-platform-audio-${player.id}`, wav, { kind: 'other' });
            onChange({ ...state, customAudioName: file.name, customAudioMediaId: meta.id });
            await playWavBlob(wav);
        } catch {
            setError('Could not read that audio. Try a wav, mp3, or m4a.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4" data-screen="ident-picker">
            <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Ident</div>
                <h2 className="text-3xl lg:text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>The sound before the picture</h2>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Each sting is synthesized here. The line under the name is the feel, then what opening night actually does with it.</p>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                    {IDENTS.map(ident => (
                        <Card key={ident.id} active={state.identId === ident.id} onClick={() => !locked && onChange({ ...state, identId: ident.id })}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="font-black text-2xl uppercase" style={{ fontFamily: headingFont }}>{ident.name}</div>
                                <button
                                    type="button"
                                    className="text-[11px] uppercase tracking-wider text-zinc-200 border border-white/15 rounded-full px-2 py-1"
                                    onClick={(event) => { event.stopPropagation(); playIdent(ident.id); }}
                                >
                                    Play
                                </button>
                            </div>
                            <p className="text-sm text-zinc-300 mt-2">{identLine(ident.id)}</p>
                        </Card>
                    ))}
                </div>
            </div>
            <Card>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">On the service</div>
                <div className="text-2xl font-black mt-1 uppercase" style={{ fontFamily: headingFont }}>{selected.name}</div>
                <p className="text-sm text-zinc-300 mt-2">{identLine(selected.id)}</p>
                <button type="button" className="mt-3 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-full bg-white text-black" onClick={() => playIdent(selected.id)}>Play this sting</button>
                <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-zinc-500">Your own clip</div>
                <p className="text-sm text-zinc-400 mt-2">Upload audio and it is trimmed to about three seconds of mono WAV. The clip replaces the sound only. {selected.name} still changes the audience.</p>
                <input
                    type="file"
                    accept="audio/*"
                    disabled={locked || busy}
                    className="mt-3 text-sm w-full"
                    onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = ''; }}
                />
                {busy && <div className="mt-2 text-sm text-zinc-400">Trimming to a short WAV…</div>}
                {state.customAudioName && <div className="mt-3 text-sm text-emerald-300">{state.customAudioName}</div>}
                {state.customAudioMediaId && (
                    <button type="button" className="mt-3 text-xs uppercase tracking-wider text-zinc-200" onClick={() => { void playSaved(); }}>Play your clip</button>
                )}
                {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
            </Card>
        </div>
    );
};
