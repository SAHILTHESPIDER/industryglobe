import React, { useState, useRef, useMemo } from 'react';
import { User, Calendar, Check, ArrowRight, Camera, UploadCloud, AtSign, Sparkles, Shuffle } from 'lucide-react';
import { Gender } from '../types';
import { MALE_AVATAR_SEEDS, FEMALE_AVATAR_SEEDS } from '../services/npcLogic';

interface CreationMenuProps {
  onStartGame: (name: string, age: number, gender: Gender, avatar: string, handle: string) => void;
}

// --- AVATAR STYLES (DiceBear 9.x) ---
const AVATAR_STYLES = [
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'avataaars', label: 'Cartoon' },
  { id: 'lorelei', label: 'Sketch' },
  { id: 'notionists', label: 'Notion' },
  { id: 'pixel-art', label: 'Pixel' },
] as const;
type AvatarStyleId = typeof AVATAR_STYLES[number]['id'];

const AVATAR_BG = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
const buildAvatarUrl = (style: AvatarStyleId, seed: string) =>
  `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${AVATAR_BG}`;

const GRAIN_SVG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export const CreationMenu: React.FC<CreationMenuProps> = ({ onStartGame }) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [isHandleEdited, setIsHandleEdited] = useState(false);
  const [age, setAge] = useState<number | string>(18);
  const [gender, setGender] = useState<Gender>('MALE');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyleId>('adventurer');
  const [shuffleSalt, setShuffleSalt] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState(buildAvatarUrl('adventurer', MALE_AVATAR_SEEDS[0]));
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter avatars based on gender + style
  const currentAvatarList = useMemo(() => {
    const seeds = gender === 'MALE'
      ? MALE_AVATAR_SEEDS
      : gender === 'FEMALE'
        ? FEMALE_AVATAR_SEEDS
        : [...MALE_AVATAR_SEEDS, ...FEMALE_AVATAR_SEEDS].sort(() => 0.5 - Math.random());

    const rotated = shuffleSalt > 0
      ? [...seeds.slice(shuffleSalt % seeds.length), ...seeds.slice(0, shuffleSalt % seeds.length)]
      : seeds;

    return rotated.slice(0, 30).map(seed => buildAvatarUrl(avatarStyle, seed));
  }, [gender, avatarStyle, shuffleSalt]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isHandleEdited) {
      setHandle(`@${newName.toLowerCase().replace(/\s+/g, '')}`);
    }
  };

  const handleHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHandle(e.target.value);
    setIsHandleEdited(true);
  };

  const handleStart = () => {
    const parsedAge = typeof age === 'string' ? parseInt(age, 10) : age;
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (!handle.trim() || handle.length < 2) {
      setError('Please enter a valid social handle.');
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 15) {
      setError('You must be at least 15 years old.');
      return;
    }
    const finalHandle = handle.startsWith('@') ? handle : `@${handle}`;
    setError('');
    onStartGame(name, parsedAge, gender, selectedAvatar, finalHandle);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          reject(new Error('Canvas context failed'));
        }
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(blobUrl);
        reject(err);
      };
      img.src = blobUrl;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file.');
        return;
      }
      setIsCompressing(true);
      setError('');
      try {
        const compressed = await compressImage(file);
        setSelectedAvatar(compressed);
        setIsCustomUpload(true);
      } catch (err) {
        console.error('Image processing failed', err);
        setError('Failed to process image. Try a smaller file.');
      } finally {
        setIsCompressing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  // Reset avatar when gender/style changes if not uploaded
  React.useEffect(() => {
    if (!isCustomUpload) {
      setSelectedAvatar(currentAvatarList[0]);
    }
  }, [gender, avatarStyle, currentAvatarList]);

  const inputClass =
    'w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl py-3.5 md:py-4 pl-12 pr-4 text-white font-bold text-base md:text-lg focus:outline-none focus:border-amber-500/60 focus:bg-zinc-900 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] transition-all placeholder:text-zinc-700';
  const labelClass = 'text-[10px] font-bold text-amber-500/70 uppercase tracking-[0.25em] mb-2 block px-1';

  return (
    <div className="h-full relative flex flex-col bg-[#050505] overflow-hidden font-sans text-white">
      <style>{`
        @keyframes cm-float { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(1.08); } }
        @keyframes cm-sweep { 0% { transform: rotate(-18deg); opacity:.35 } 50% { transform: rotate(14deg); opacity:.6 } 100% { transform: rotate(-18deg); opacity:.35 } }
        @keyframes cm-shimmer { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
        .cm-float { animation: cm-float 16s ease-in-out infinite; }
        .cm-sweep { animation: cm-sweep 12s ease-in-out infinite; transform-origin: 50% -20%; }
        .cm-gold { background: linear-gradient(90deg,#8a5a12,#f5d27a,#ffe9a8,#f5d27a,#8a5a12); background-size:200% auto; -webkit-background-clip:text; background-clip:text; color:transparent; animation: cm-shimmer 6s linear infinite; }
        .cm-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .cm-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,.35); border-radius: 999px; }
      `}</style>

      {/* Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="cm-sweep absolute -top-[30%] left-1/2 -translate-x-1/2 w-[70vw] max-w-[900px] h-[120vh] bg-[conic-gradient(from_180deg_at_50%_0%,transparent_40%,rgba(245,158,11,0.18)_50%,transparent_60%)] blur-2xl" />
        <div className="cm-float absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-amber-700/15 blur-[120px]" />
        <div className="cm-float absolute -bottom-40 -left-32 w-[480px] h-[480px] rounded-full bg-indigo-900/25 blur-[110px]" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN_SVG }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto cm-scroll relative z-10">
        <div className="min-h-full flex flex-col px-4 sm:px-6 lg:px-10 pt-6 pb-28 lg:pb-10 max-w-6xl mx-auto w-full">

          {/* Header */}
          <div className="text-center mb-6 lg:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/5 text-[10px] uppercase tracking-[0.3em] text-amber-300/80 mb-4">
              <Sparkles size={12} /> Casting Call
            </div>
            <h1 className="cm-gold text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none">
              Create Your Star
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm tracking-wide mt-3">Define the face of the next generation.</p>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-start">

            {/* ================= AVATAR PANEL ================= */}
            <div className="lg:sticky lg:top-0 space-y-4">
              <div className="rounded-3xl border border-amber-500/15 bg-gradient-to-b from-zinc-900/80 to-black/80 backdrop-blur-md p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">

                {/* Preview */}
                <div className="flex flex-col items-center">
                  <div className="relative group cursor-pointer" onClick={triggerFileUpload}>
                    <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-2xl scale-110 group-hover:scale-125 transition-transform" />
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full p-[3px] bg-[conic-gradient(from_0deg,#8a5a12,#f5d27a,#ffe9a8,#8a5a12,#f5d27a,#8a5a12)] shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-transform duration-300 group-hover:scale-[1.03]">
                      {isCompressing ? (
                        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center border-4 border-black">
                          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <img
                          src={selectedAvatar}
                          alt="Selected Avatar"
                          className="w-full h-full rounded-full bg-zinc-900 object-cover border-4 border-black"
                        />
                      )}
                    </div>
                    <div className="absolute bottom-1 right-1 bg-amber-400 text-black p-2 rounded-full border-4 border-black shadow-xl z-20 group-hover:bg-amber-200 transition-colors">
                      <Camera size={16} />
                    </div>
                    {/* iPad crash fix: keep input in layout, not display:none */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="absolute opacity-0 w-1 h-1 -z-10 overflow-hidden top-0 left-0"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <button
                    onClick={triggerFileUpload}
                    className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-4 hover:text-amber-300 transition-colors flex items-center gap-1.5"
                  >
                    <UploadCloud size={12} /> Upload your own photo
                  </button>
                  {isCustomUpload && (
                    <button
                      onClick={() => { setIsCustomUpload(false); setSelectedAvatar(currentAvatarList[0]); }}
                      className="text-[10px] text-zinc-600 underline underline-offset-2 mt-1 hover:text-zinc-400"
                    >
                      back to presets
                    </button>
                  )}
                </div>

                {/* Style switcher */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className={labelClass + ' mb-0'}>Look</label>
                    <button
                      type="button"
                      onClick={() => setShuffleSalt(s => s + 7)}
                      className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <Shuffle size={11} /> Shuffle
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto cm-scroll pb-1 -mx-1 px-1">
                    {AVATAR_STYLES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setAvatarStyle(s.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide border transition-all ${
                          avatarStyle === s.id
                            ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-amber-500/40 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset grid */}
                <div className="mt-4">
                  <label className={labelClass}>Choose Preset</label>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-2.5 max-h-44 sm:max-h-56 lg:max-h-64 overflow-y-auto cm-scroll pr-1">
                    {currentAvatarList.map((avatarUrl, idx) => {
                      const isSelected = !isCustomUpload && selectedAvatar === avatarUrl;
                      return (
                        <button
                          key={`${avatarStyle}-${idx}`}
                          type="button"
                          onClick={() => { setSelectedAvatar(avatarUrl); setIsCustomUpload(false); }}
                          className={`aspect-square rounded-xl overflow-hidden relative transition-all duration-200 border ${
                            isSelected
                              ? 'border-amber-400 ring-2 ring-amber-500/60 scale-105 z-10 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
                              : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105 hover:border-zinc-600'
                          }`}
                        >
                          <img src={avatarUrl} alt="avatar" loading="lazy" className="w-full h-full bg-zinc-800 object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                              <Check size={14} className="text-amber-200 drop-shadow" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ================= FORM PANEL ================= */}
            <div className="space-y-5">
              {/* Gender */}
              <div>
                <label className={labelClass}>Identity</label>
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-900/70 p-1.5 rounded-2xl border border-zinc-800">
                  {([
                    ['MALE', 'Male'],
                    ['FEMALE', 'Female'],
                    ['NON_BINARY', 'Non-Binary'],
                  ] as [Gender, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(value)}
                      className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        gender === value
                          ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_6px_20px_rgba(245,158,11,0.35)]'
                          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelClass}>Stage Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                    <User size={18} />
                  </div>
                  <input type="text" placeholder="e.g. Alex Sterling" value={name} onChange={handleNameChange} className={inputClass} />
                </div>
              </div>

              {/* Handle + Age side by side on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
                <div>
                  <label className={labelClass}>Social Handle</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                      <AtSign size={18} />
                    </div>
                    <input type="text" placeholder="@alexsterling" value={handle} onChange={handleHandleChange} className={inputClass + ' font-mono'} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Starting Age</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                      <Calendar size={18} />
                    </div>
                    <input
                      type="number"
                      placeholder="18"
                      value={age}
                      min={15}
                      max={99}
                      onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Live card preview */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-4">
                <img src={selectedAvatar} alt="" className="w-12 h-12 rounded-full object-cover bg-zinc-800 border border-amber-500/30 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">{name.trim() || 'Your Stage Name'}</p>
                  <p className="text-xs text-zinc-500 font-mono truncate">
                    {handle.trim() || '@handle'} · {age || '—'} yrs · {gender === 'NON_BINARY' ? 'Non-Binary' : gender === 'MALE' ? 'Male' : 'Female'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-center">
                  <p className="text-rose-300 text-xs font-bold">{error}</p>
                </div>
              )}

              {/* Desktop CTA */}
              <button
                type="button"
                onClick={handleStart}
                disabled={isCompressing}
                className={`hidden lg:flex group w-full py-5 rounded-2xl font-black text-lg tracking-wide items-center justify-center gap-2 relative overflow-hidden transition-all ${
                  isCompressing
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_30px_rgba(245,158,11,0.35)] hover:shadow-[0_0_50px_rgba(245,158,11,0.55)] hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isCompressing ? 'Processing Image...' : <>Begin Career <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
                </span>
                {!isCompressing && <div className="absolute inset-0 bg-white/25 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-xl" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
        <button
          type="button"
          onClick={handleStart}
          disabled={isCompressing}
          className={`group w-full py-4 rounded-2xl font-black text-base tracking-wide flex items-center justify-center gap-2 relative overflow-hidden transition-all ${
            isCompressing
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-[0.98]'
          }`}
        >
          {isCompressing ? 'Processing Image...' : <>Begin Career <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
};