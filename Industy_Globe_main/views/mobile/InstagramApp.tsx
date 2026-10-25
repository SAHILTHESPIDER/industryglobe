import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Player, InstaPost, InstaPostType, NPCActor, NPCState, InteractionType } from '../../types';
import { NPC_DATABASE } from '../../services/npcLogic';
import { getEnabledGlobalCreatorSocialProfiles } from '../../services/youtubeLogic';
import { getInstagramPostComments, getInstagramPresetCaption, INSTAGRAM_POST_CONFIGS } from '../../services/instagramLogic';
import { loadMediaBlob, pruneMediaStore, saveMediaBlob } from '../../services/mediaStorage';
import {
    Camera, Heart, MessageCircle, Send, Search, Grid, ArrowLeft, Video, Sparkles, Popcorn, Zap, Check, Briefcase,
    Handshake, Smile, Lock, Coffee, Images, Clapperboard, Flame, Shirt, Bookmark, BarChart3, ImagePlus, Home,
    PlusSquare, MoreHorizontal, UserSquare, ChevronDown, Menu, X, Plus, Phone, Info, BadgeCheck, Settings2
} from 'lucide-react';

type InstagramFitMode = 'cover' | 'contain';
const INSTAGRAM_IMAGE_SIZE = 1080;

// Instagram palette
const IG = {
    blue: '#0095f6',
    red: '#ff3040',
    divider: 'border-[#262626]',
    muted: 'text-[#a8a8a8]',
    surface: 'bg-[#121212]',
    input: 'bg-[#262626]',
    ring: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
};

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Could not encode Instagram image.'));
        }, type, quality);
    });

const createFittedInstagramBlob = async (
    sourceUrl: string,
    zoom: number,
    offsetX: number,
    offsetY: number,
    fitMode: InstagramFitMode
): Promise<Blob> => {
    const image = await loadImageElement(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = INSTAGRAM_IMAGE_SIZE;
    canvas.height = INSTAGRAM_IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable.');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, INSTAGRAM_IMAGE_SIZE, INSTAGRAM_IMAGE_SIZE);

    const baseScale = fitMode === 'contain'
        ? Math.min(INSTAGRAM_IMAGE_SIZE / image.naturalWidth, INSTAGRAM_IMAGE_SIZE / image.naturalHeight)
        : Math.max(INSTAGRAM_IMAGE_SIZE / image.naturalWidth, INSTAGRAM_IMAGE_SIZE / image.naturalHeight);
    const finalScale = baseScale * zoom;
    const drawWidth = image.naturalWidth * finalScale;
    const drawHeight = image.naturalHeight * finalScale;
    const maxPanX = Math.max(0, (drawWidth - INSTAGRAM_IMAGE_SIZE) / 2);
    const maxPanY = Math.max(0, (drawHeight - INSTAGRAM_IMAGE_SIZE) / 2);
    const panX = Math.max(-maxPanX, Math.min(maxPanX, offsetX));
    const panY = Math.max(-maxPanY, Math.min(maxPanY, offsetY));

    ctx.drawImage(
        image,
        (INSTAGRAM_IMAGE_SIZE - drawWidth) / 2 + panX,
        (INSTAGRAM_IMAGE_SIZE - drawHeight) / 2 + panY,
        drawWidth,
        drawHeight
    );

    return canvasToBlob(canvas, 'image/webp', 0.78);
};

const InstagramPostVisual: React.FC<{
    post: InstaPost;
    getPostStyle: (type: InstaPostType) => string;
    className?: string;
    children?: React.ReactNode;
}> = ({ post, getPostStyle, className = '', children }) => {
    const [src, setSrc] = useState<string | null>(post.contentImage || null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        if (!post.contentMediaId) {
            setSrc(post.contentImage || null);
            return undefined;
        }

        loadMediaBlob(post.contentMediaId)
            .then(blob => {
                if (!blob || cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setSrc(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setSrc(post.contentImage || null);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [post.contentMediaId, post.contentImage]);

    return (
        <div className={`aspect-square w-full flex items-center justify-center relative overflow-hidden ${src ? 'bg-black' : getPostStyle(post.type)} ${className}`}>
            {src ? (
                <img src={src} className="w-full h-full object-cover" />
            ) : (
                <>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_75%_80%,rgba(0,0,0,0.35),transparent_45%)]" />
                    <div className="relative z-10 text-center px-4">
                        <span className="block text-white/90 font-black text-3xl uppercase tracking-tight drop-shadow-lg">
                            {post.type.replace(/_/g, ' ')}
                        </span>
                    </div>
                </>
            )}
            {children}
        </div>
    );
};

/* Instagram-style icon helpers */
const VerifiedBadge: React.FC<{ size?: number }> = ({ size = 12 }) => (
    <BadgeCheck size={size} className="text-[#0095f6] fill-[#0095f6] shrink-0" strokeWidth={2.5} stroke="#000" />
);

const StoryRing: React.FC<{ src: string; size?: string; seen?: boolean; onClick?: () => void; children?: React.ReactNode }> = ({ src, size = 'w-16 h-16', seen, onClick, children }) => (
    <div onClick={onClick} className={`${size} rounded-full p-[2.5px] shrink-0 ${seen ? 'bg-[#363636]' : IG.ring} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}>
        <div className="w-full h-full rounded-full bg-black p-[2px] relative">
            <img src={src} className="w-full h-full rounded-full object-cover" />
            {children}
        </div>
    </div>
);

interface InstagramAppProps {
  player: Player;
  onBack: () => void;
  onPost: (type: InstaPostType, caption: string, image?: string) => void;
  onReactPost: (postId: string, action: 'LIKE' | 'SAVE') => void;
  onRespondDM: (npc: NPCActor, actionId: string, accepted: boolean) => void;
  onFollow: (npc: NPCActor) => void;
  onInteract: (npc: NPCActor, type: InteractionType) => void;
}

export const InstagramApp: React.FC<InstagramAppProps> = ({ player, onBack, onPost, onReactPost, onRespondDM, onFollow, onInteract }) => {
  const [tab, setTab] = useState<'FEED' | 'SEARCH' | 'PROFILE'>('FEED');
  const [view, setView] = useState<'MAIN' | 'NPC_PROFILE' | 'DM_LIST' | 'DM' | 'POST_DETAIL'>('MAIN');
  const [dmReturnView, setDmReturnView] = useState<'DM_LIST' | 'NPC_PROFILE'>('DM_LIST');
  const [selectedNPC, setSelectedNPC] = useState<NPCActor | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstaPost | null>(null);
  const [profileGridTab, setProfileGridTab] = useState<'GRID' | 'REELS' | 'TAGGED'>('GRID');

  // Post Creation State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [selectedPresetType, setSelectedPresetType] = useState<InstaPostType>('LIFESTYLE');
  const [imageSourceUrl, setImageSourceUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [imageFitMode, setImageFitMode] = useState<InstagramFitMode>('cover');
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageError, setImageError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageSourceUrlRef = useRef<string | null>(null);

  // Safe Access
  const feed = player.instagram?.feed || [];
  const posts = player.instagram?.posts || [];
  const npcStates = (player.instagram?.npcStates || {}) as Record<string, NPCState>;
  const creatorProfiles = getEnabledGlobalCreatorSocialProfiles(player);
  const npcPool = [...NPC_DATABASE, ...(Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : []), ...creatorProfiles]
    .filter((npc, idx, arr) => arr.findIndex(entry => entry.id === npc.id) === idx);

  // Post Conditions
  const hasActiveRole = player.commitments.some(c => c.type === 'ACTING_GIG');
  const hasFilmingRole = player.commitments.some(c => c.type === 'ACTING_GIG' && c.projectPhase === 'PRODUCTION');
  const hasReleasedMovie = player.activeReleases.some(r => r.status === 'RUNNING' || r.status === 'BLOCKBUSTER_TRACK' || r.status === 'FLOP_WARNING');
  const hasRomance = player.relationships.some(r =>
      (r.relation === 'Partner' || r.relation === 'Spouse') && (r.closeness ?? 0) >= 50
  );
  const publicFollowers = Math.max(player.stats.followers || 0, player.instagram?.followers || 0);
  const selectedConfig = INSTAGRAM_POST_CONFIGS[selectedPresetType];
  const dmContacts = npcPool
      .map(npc => ({ npc, state: npcStates[npc.id] }))
      .filter(entry => (entry.state?.chatHistory || []).length > 0)
      .sort((a, b) => {
          const aLast = a.state.chatHistory[a.state.chatHistory.length - 1]?.timestamp || 0;
          const bLast = b.state.chatHistory[b.state.chatHistory.length - 1]?.timestamp || 0;
          return bLast - aLast;
      });
  const hasPendingDM = dmContacts.some(entry => entry.state.chatHistory.some(msg => msg.sender === 'NPC' && msg.action?.status === 'PENDING'));
  const selectedNpcState = selectedNPC ? npcStates[selectedNPC.id] : undefined;
  const selectedPendingDmAction = selectedNpcState?.chatHistory?.find(msg => msg.sender === 'NPC' && msg.action?.status === 'PENDING')?.action;

  const getDmActionTitle = (kind?: string) => {
      if (kind === 'IG_REFERRAL') return 'Referral Lead';
      if (kind === 'IG_BRAND_OFFER') return 'Paid Brand Deal';
      return 'Drama DM';
  };

  const getDmActionDetails = (action?: NPCState['chatHistory'][number]['action']) => {
      if (!action) return '';
      const payload = action.payload || {};
      if (action.kind === 'IG_BRAND_OFFER' && payload.offer) {
          const offer = payload.offer;
          return `$${Math.round(offer.weeklyPay || 0).toLocaleString()}/week • ${offer.durationWeeks || 4} weeks • ${offer.requirements?.totalRequired || 2} posts • expires in ${payload.expiresWeeks || offer.expiresIn || 3} weeks`;
      }
      if (action.kind === 'IG_REFERRAL') {
          const weeks = Math.max(1, Math.round(payload.weeksLeft || 2));
          return `Casting may respond in ${weeks}-${weeks + 1} weeks • expires in ${payload.expiresWeeks || 3} weeks`;
      }
      return 'Your reply can affect reputation and relationships.';
  };

  const isBrand = (npc: NPCActor) => npc.id.startsWith('ig_brand_account_') || npc.forbesCategory === 'Brand';

  const selectedNpcProfilePosts = useMemo(() => {
      if (!selectedNPC) return [];
      const realPosts = feed
          .filter(post => post.authorId === selectedNPC.id || post.authorHandle === selectedNPC.handle)
          .sort((a, b) => ((b.year || 0) * 52 + (b.week || 0)) - ((a.year || 0) * 52 + (a.week || 0)));
      const accountSeed = selectedNPC.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const isBrandAccount = isBrand(selectedNPC);
      const typeCycle: InstaPostType[] = isBrandAccount
          ? ['BRAND_FIT', 'CAROUSEL', 'REEL', 'LIFESTYLE', 'BRAND_FIT', 'INDUSTRY_NEWS']
          : selectedNPC.occupation === 'DIRECTOR'
              ? ['BTS', 'INDUSTRY_NEWS', 'ANNOUNCEMENT', 'CAROUSEL', 'RED_CARPET', 'LIFESTYLE']
              : ['RED_CARPET', 'BTS', 'SELFIE', 'CAROUSEL', 'ANNOUNCEMENT', 'LIFESTYLE'];
      const captions = isBrandAccount
          ? ['New drop energy.', 'Built for the feed.', 'Creator campaign board is open.', 'Styled, shot, shipped.', 'Tiny brand, loud taste.', 'The brief is clean.']
          : selectedNPC.occupation === 'DIRECTOR'
              ? ['Back on set.', 'Frames from prep.', 'Casting week energy.', 'Quietly building something.', 'The work continues.', 'One more scene.']
              : ['Set life lately.', 'Premiere night.', 'Between takes.', 'Keeping it moving.', 'New chapter loading.', 'Grateful for the work.'];
      const syntheticPosts: InstaPost[] = Array.from({ length: 9 }).map((_, index) => {
          const type = typeCycle[(accountSeed + index) % typeCycle.length];
          const followerBase = Math.max(1000, selectedNPC.followers || 1000);
          const likes = Math.floor(followerBase * (0.012 + (((accountSeed + index * 7) % 18) / 1000)));
          return {
              id: `npc_profile_${selectedNPC.id}_${index}`,
              authorId: selectedNPC.id,
              authorName: selectedNPC.name,
              authorHandle: selectedNPC.handle,
              authorAvatar: selectedNPC.avatar,
              type,
              caption: captions[index % captions.length],
              week: Math.max(1, player.currentWeek - index),
              year: player.age,
              likes,
              comments: Math.max(4, Math.floor(likes * 0.045)),
              shares: Math.max(1, Math.floor(likes * 0.018)),
              saves: Math.max(1, Math.floor(likes * 0.03)),
              commentList: getInstagramPostComments(type, 5),
              isPlayer: false
          };
      });
      return [...realPosts, ...syntheticPosts.filter(post => !realPosts.some(real => real.id === post.id))].slice(0, 9);
  }, [selectedNPC, feed, player.age, player.currentWeek]);

  const selectedNpcPostCount = selectedNPC
      ? Math.max(
          selectedNpcProfilePosts.length,
          isBrand(selectedNPC)
              ? 24 + (selectedNPC.followers % 40)
              : selectedNPC.tier === 'A_LIST' || selectedNPC.tier === 'ICON'
                  ? 120 + (selectedNPC.followers % 80)
                  : 45 + (selectedNPC.followers % 55)
      )
      : 0;
  const selectedNpcFollowingCount = selectedNPC
      ? Math.max(20, Math.floor(Math.sqrt(Math.max(1, selectedNPC.followers || 1)) * (selectedNPC.id.startsWith('ig_brand_account_') ? 0.9 : 1.7)))
      : 0;

  useEffect(() => {
      if (view === 'DM') {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [view, npcStates, selectedNPC]);

  useEffect(() => {
      imageSourceUrlRef.current = imageSourceUrl;
  }, [imageSourceUrl]);

  useEffect(() => {
      return () => {
          if (imageSourceUrlRef.current) URL.revokeObjectURL(imageSourceUrlRef.current);
      };
  }, []);

  const handleNPCClick = (npc: NPCActor) => {
      setSelectedNPC(npc);
      setView('NPC_PROFILE');
  };

  const handleOpenDM = () => {
      setDmReturnView('NPC_PROFILE');
      setView('DM');
  };

  const handleOpenDMInbox = () => {
      setSelectedNPC(null);
      setView('DM_LIST');
  };

  const handleOpenDMThread = (npc: NPCActor) => {
      setSelectedNPC(npc);
      setDmReturnView('DM_LIST');
      setView('DM');
  };

  const handleBackNav = () => {
      if (view === 'DM') {
          setView(dmReturnView);
      } else if (view === 'DM_LIST') {
          setView('MAIN');
      } else if (view === 'POST_DETAIL') {
          setView('MAIN');
          setSelectedPost(null);
      } else if (view === 'NPC_PROFILE') {
          setView('MAIN');
          setSelectedNPC(null);
      } else {
          onBack();
      }
  };

  const formatFollowers = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (num >= 10000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return num.toLocaleString();
  };

  const getPostAvatar = (post: InstaPost) => {
      if (post.isPlayer) return player.avatar;
      const npc = npcPool.find(entry => entry.id === post.authorId || entry.handle === post.authorHandle);
      return post.authorAvatar || npc?.avatar || `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(post.authorHandle || post.authorName || 'IG')}`;
  };

  const getCommentAuthor = (type: InstaPostType, idx: number) => {
      const pools: Record<InstaPostType, string[]> = {
          LIFESTYLE: ['quietfancam', 'softresetclub', 'dailycinema', 'offdaydiary', 'vibesarchive'],
          SELFIE: ['facecardfiles', 'goldenhourfan', 'glamwatch', 'portraitclub', 'screencrushie'],
          REEL: ['reelwatcher', 'clipculture', 'algorithmfoundme', 'editdetective', 'scrollstopper'],
          CAROUSEL: ['slidethree', 'photodumpdaily', 'moodboardfiles', 'tinyframeclub', 'candidcorner'],
          BTS: ['setlifeupdates', 'calltimecrew', 'filmsetwatch', 'trailerdoor', 'crewappreciation'],
          ANNOUNCEMENT: ['castingroom', 'tradegirlie', 'franchisewatch', 'alreadyseated', 'projecttracker'],
          CELEBRATION: ['dayonefan', 'awardseasonwatch', 'winarchive', 'careerarc', 'proudviewer'],
          RED_CARPET: ['bestdressedwatch', 'stylistfiles', 'runwayrecap', 'lookbreakdown', 'tailoringnerd'],
          COUPLE_POST: ['softlaunchunit', 'chemistrywatch', 'timelinecouple', 'romancearchive', 'datingdetective'],
          BRAND_FIT: ['adwatcher', 'fitcheckdaily', 'brandbrief', 'productplacement', 'stylecommerce'],
          CONTROVERSIAL: ['prwatchdog', 'screenshotclub', 'messyfeeds', 'quotechaos', 'damagecontrol'],
          INDUSTRY_NEWS: ['tradepaper', 'rumorledger', 'studiohallway', 'industryplant', 'castingtea']
      };
      const pool = pools[type] || pools.LIFESTYLE;
      return pool[idx % pool.length];
  };

  const openPostDetail = (post: InstaPost) => {
      setSelectedPost(post);
      setView('POST_DETAIL');
  };

  const getRelationshipLabel = (score: number) => {
      if (score >= 80) return { label: 'Inner Circle', color: 'text-emerald-400', bar: 'bg-emerald-500' };
      if (score >= 60) return { label: 'Close Friend', color: 'text-teal-400', bar: 'bg-teal-500' };
      if (score >= 40) return { label: 'Friendly', color: 'text-[#0095f6]', bar: 'bg-[#0095f6]' };
      if (score >= 20) return { label: 'Acquaintance', color: 'text-yellow-400', bar: 'bg-yellow-500' };
      return { label: 'Stranger', color: 'text-[#a8a8a8]', bar: 'bg-[#363636]' };
  };

  const getPostStyle = (type: InstaPostType) => {
      return INSTAGRAM_POST_CONFIGS[type]?.colorClass || 'bg-zinc-800';
  };

  const imageImageClass = (fitMode: InstagramFitMode) =>
      fitMode === 'contain' ? 'w-full h-full object-contain' : 'w-full h-full object-cover';

  const imageImageStyle = (zoom: number, offsetX: number, offsetY: number) => ({
      transform: `translate(${offsetX / 8}px, ${offsetY / 8}px) scale(${zoom})`,
      transformOrigin: 'center',
  });

  const resetImageDraft = () => {
      if (imageSourceUrl) URL.revokeObjectURL(imageSourceUrl);
      setImageSourceUrl(null);
      setImageZoom(1);
      setImageOffsetX(0);
      setImageOffsetY(0);
      setImageFitMode('cover');
      setImageError('');
      if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const closeCreator = () => {
      setIsCreatingPost(false);
      setPostCaption('');
      setSelectedPresetType('LIFESTYLE');
      resetImageDraft();
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          setImageError('Choose an image file for the post.');
          return;
      }
      if (file.size > 12 * 1024 * 1024) {
          setImageError('That image is too large. Try one under 12MB.');
          return;
      }
      if (imageSourceUrl) URL.revokeObjectURL(imageSourceUrl);
      setImageSourceUrl(URL.createObjectURL(file));
      setImageZoom(1);
      setImageOffsetX(0);
      setImageOffsetY(0);
      setImageFitMode('cover');
      setImageError('');
  };

  const handleCreatePost = async () => {
      if (isImageProcessing) return;
      let finalCaption = postCaption.trim();
      if (!finalCaption) {
          finalCaption = getInstagramPresetCaption(selectedPresetType);
      }

      setIsImageProcessing(true);
      let contentMediaId: string | undefined;
      try {
          if (imageSourceUrl) {
              contentMediaId = `ig_post_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              const imageBlob = await createFittedInstagramBlob(imageSourceUrl, imageZoom, imageOffsetX, imageOffsetY, imageFitMode);
              await saveMediaBlob(contentMediaId, imageBlob, {
                  kind: 'instagram_post',
                  width: INSTAGRAM_IMAGE_SIZE,
                  height: INSTAGRAM_IMAGE_SIZE
              });
              await pruneMediaStore('instagram_post', { maxItems: 160, maxBytes: 80 * 1024 * 1024 });
          }
      } catch (err) {
          console.error('Instagram image processing failed', err);
          setImageError('Could not save that image. Try another photo.');
          setIsImageProcessing(false);
          return;
      }

      onPost(selectedPresetType, finalCaption, contentMediaId);
      setIsImageProcessing(false);
      closeCreator();
  };

  const postTypeOptions: Array<{
      type: InstaPostType;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      lockReason?: string;
  }> = [
      { type: 'LIFESTYLE', title: 'Lifestyle', subtitle: 'Daily life, soft growth.', icon: <Camera size={18} /> },
      { type: 'SELFIE', title: 'Selfie', subtitle: 'Personal and fan-friendly.', icon: <Smile size={18} /> },
      { type: 'REEL', title: 'Reel', subtitle: 'More reach, short-form vibe.', icon: <Clapperboard size={18} /> },
      { type: 'CAROUSEL', title: 'Photo Dump', subtitle: 'Authentic multi-photo post.', icon: <Images size={18} /> },
      { type: 'BTS', title: 'On Set BTS', subtitle: 'Behind the scenes from filming.', icon: <Video size={18} />, lockReason: hasFilmingRole ? undefined : 'Start filming a role' },
      { type: 'ANNOUNCEMENT', title: 'Announcement', subtitle: 'Project or casting news.', icon: <Sparkles size={18} />, lockReason: hasActiveRole ? undefined : 'Need an active role' },
      { type: 'RED_CARPET', title: 'Red Carpet', subtitle: 'Prestige and fashion moment.', icon: <Sparkles size={18} />, lockReason: hasReleasedMovie || player.stats.fame >= 20 ? undefined : 'Need release or 20 fame' },
      { type: 'COUPLE_POST', title: 'Couple Post', subtitle: 'Relationship content.', icon: <Heart size={18} />, lockReason: hasRomance ? undefined : 'Need a public romance' },
      { type: 'BRAND_FIT', title: 'Brand Fit', subtitle: 'Influence and style signal.', icon: <Shirt size={18} />, lockReason: publicFollowers >= 1000 || player.stats.fame >= 15 ? undefined : 'Need 1k followers or 15 fame' },
      { type: 'CELEBRATION', title: 'Celebrate Release', subtitle: 'Turn a release into momentum.', icon: <Popcorn size={18} />, lockReason: hasReleasedMovie ? undefined : 'Need an active release' },
      { type: 'CONTROVERSIAL', title: 'Hot Take', subtitle: 'High reach, backlash risk.', icon: <Flame size={18} /> }
  ];

  const followingCount = Object.values(npcStates).filter(s => s.isFollowing).length;
  const likedByNpc = npcPool[0];

  /* ---------- Shared sub-renders ---------- */

  const renderPostCard = (post: InstaPost) => {
      const authorNPC = npcPool.find(n => n.id === post.authorId);
      const avatarSrc = getPostAvatar(post);
      return (
          <article key={post.id} className="pb-3">
              {/* Post header */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                  <StoryRing src={avatarSrc} size="w-9 h-9" seen={post.isPlayer} onClick={() => authorNPC && handleNPCClick(authorNPC)} />
                  <div className="flex-1 min-w-0 leading-tight">
                      <div className="flex items-center gap-1">
                          <span className="font-semibold text-[13px] cursor-pointer truncate" onClick={() => authorNPC && handleNPCClick(authorNPC)}>{post.authorHandle}</span>
                          {authorNPC?.tier === 'A_LIST' && <VerifiedBadge />}
                      </div>
                      {!post.isPlayer && <div className={`text-[11px] ${IG.muted}`}>Suggested for you</div>}
                  </div>
                  <button className="p-1"><MoreHorizontal size={20} /></button>
              </div>

              {/* Media */}
              <button onClick={() => openPostDetail(post)} className="w-full block">
                  <InstagramPostVisual post={post} getPostStyle={getPostStyle} />
              </button>

              {/* Action row */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                  <div className="flex items-center gap-4">
                      <Heart
                          size={26}
                          strokeWidth={1.75}
                          fill={post.hasLiked ? IG.red : 'none'}
                          className={`cursor-pointer active:scale-110 transition-transform ${post.hasLiked ? 'text-[#ff3040]' : 'text-white'}`}
                          onClick={() => onReactPost(post.id, 'LIKE')}
                      />
                      <MessageCircle size={26} strokeWidth={1.75} className="cursor-pointer -scale-x-100" onClick={() => openPostDetail(post)} />
                      <Send size={25} strokeWidth={1.75} className="cursor-pointer" />
                  </div>
                  <Bookmark
                      size={26}
                      strokeWidth={1.75}
                      fill={post.hasSaved ? 'white' : 'none'}
                      className="cursor-pointer"
                      onClick={() => onReactPost(post.id, 'SAVE')}
                  />
              </div>

              {/* Likes */}
              <div className="px-3 text-[13px]">
                  {likedByNpc && !post.isPlayer ? (
                      <div className="flex items-center gap-2">
                          <img src={likedByNpc.avatar} className="w-5 h-5 rounded-full object-cover border border-black" />
                          <span>Liked by <span className="font-semibold">{likedByNpc.handle}</span> and <span className="font-semibold">{formatFollowers(Math.max(0, post.likes - 1))} others</span></span>
                      </div>
                  ) : (
                      <div className="font-semibold">{post.likes.toLocaleString()} likes</div>
                  )}
              </div>

              {/* Caption */}
              <div className="px-3 mt-1 text-[13px] leading-snug">
                  <span className="font-semibold mr-1.5">{post.authorHandle}</span>
                  <span className="text-white">{post.caption}</span>
              </div>
              <button onClick={() => openPostDetail(post)} className={`px-3 mt-1 text-[13px] ${IG.muted}`}>
                  View all {post.comments.toLocaleString()} comments
              </button>
              <div className={`px-3 mt-1 text-[10px] uppercase ${IG.muted}`}>Week {post.week}</div>
          </article>
      );
  };

  const renderProfileGrid = (items: InstaPost[], emptyText: string) => (
      <div className="grid grid-cols-3 gap-[2px]">
          {items.length === 0 ? (
              <div className={`col-span-3 py-20 text-center flex flex-col items-center gap-3 ${IG.muted}`}>
                  <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center text-white"><Camera size={28} strokeWidth={1.25} /></div>
                  <div className="text-white font-bold text-xl">{emptyText}</div>
              </div>
          ) : (
              items.map(post => (
                  <button key={post.id} onClick={() => openPostDetail(post)} className="relative block overflow-hidden active:opacity-70">
                      <InstagramPostVisual post={post} getPostStyle={getPostStyle}>
                          {post.type === 'REEL' && <Clapperboard size={16} className="absolute top-2 right-2 drop-shadow" />}
                          {post.type === 'CAROUSEL' && <Images size={16} className="absolute top-2 right-2 drop-shadow" />}
                      </InstagramPostVisual>
                  </button>
              ))
          )}
      </div>
  );

  return (
    <div className="absolute inset-0 bg-black flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 overflow-hidden font-sans">

        {/* ================= HEADER ================= */}
        <div className={`pt-12 pb-2 px-4 flex items-center justify-between shrink-0 bg-black z-10 ${view === 'MAIN' && tab === 'FEED' ? '' : `border-b ${IG.divider}`}`}>
            {view === 'MAIN' && tab === 'FEED' && (
                <>
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="-ml-1 p-1"><ArrowLeft size={22} /></button>
                        <div
                            className="text-[28px] leading-none tracking-tight"
                            style={{ fontFamily: "'Billabong', 'Grand Hotel', 'Brush Script MT', 'Segoe Script', cursive" }}
                        >
                            Instagram
                        </div>
                        <ChevronDown size={14} className="mt-1" />
                    </div>
                    <div className="flex items-center gap-5">
                        <button className="relative"><Heart size={25} strokeWidth={1.75} /></button>
                        <button onClick={handleOpenDMInbox} className="relative">
                            <Send size={24} strokeWidth={1.75} className="-rotate-12 translate-y-[1px]" />
                            {hasPendingDM && (
                                <span className="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff3040] border-2 border-black text-[10px] font-bold flex items-center justify-center">
                                    {dmContacts.filter(e => e.state.chatHistory.some(m => m.sender === 'NPC' && m.action?.status === 'PENDING')).length}
                                </span>
                            )}
                        </button>
                    </div>
                </>
            )}
            {view === 'MAIN' && tab === 'SEARCH' && (
                <div className={`flex-1 flex items-center gap-2 ${IG.input} rounded-xl px-3 py-2`}>
                    <Search size={16} className={IG.muted} />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-[15px] text-white placeholder:text-[#a8a8a8] focus:outline-none"
                    />
                    {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16} className={IG.muted} /></button>}
                </div>
            )}
            {view === 'MAIN' && tab === 'PROFILE' && (
                <>
                    <div className="flex items-center gap-1.5">
                        <Lock size={13} className="text-white" />
                        <span className="font-bold text-[20px]">{player.instagram.handle}</span>
                        <ChevronDown size={16} />
                    </div>
                    <div className="flex items-center gap-5">
                        <button onClick={() => setIsCreatingPost(true)}><PlusSquare size={25} strokeWidth={1.75} /></button>
                        <button><Menu size={26} strokeWidth={1.75} /></button>
                    </div>
                </>
            )}
            {view !== 'MAIN' && (
                <>
                    <button onClick={handleBackNav} className="p-1 -ml-2"><ArrowLeft size={24} /></button>
                    {view === 'DM' && selectedNPC ? (
                        <div className="flex-1 flex items-center gap-2.5 ml-1 min-w-0">
                            <img src={selectedNPC.avatar} className="w-8 h-8 rounded-full object-cover" />
                            <div className="min-w-0 leading-tight">
                                <div className="flex items-center gap-1 text-[14px] font-semibold truncate">{selectedNPC.name} {selectedNPC.tier === 'A_LIST' && <VerifiedBadge />}</div>
                                <div className={`text-[11px] ${IG.muted} truncate`}>{selectedNPC.handle}</div>
                            </div>
                        </div>
                    ) : view === 'DM_LIST' ? (
                        <div className="flex-1 flex items-center gap-1 ml-1 font-bold text-[20px]">
                            {player.instagram.handle} <ChevronDown size={16} />
                        </div>
                    ) : (
                        <div className="font-bold text-[16px] flex-1 text-center pr-6 truncate">
                            {view === 'POST_DETAIL' ? 'Post' : selectedNPC?.handle}
                        </div>
                    )}
                    {view === 'DM' && (
                        <div className="flex items-center gap-4">
                            <Phone size={22} strokeWidth={1.75} />
                            <Video size={24} strokeWidth={1.75} />
                        </div>
                    )}
                    {view === 'DM_LIST' && <button><PlusSquare size={24} strokeWidth={1.75} /></button>}
                    {view === 'NPC_PROFILE' && <button><MoreHorizontal size={22} /></button>}
                </>
            )}
        </div>

        {/* ================= MAIN ================= */}
        {view === 'MAIN' && (
            <>
                {/* FEED */}
                {tab === 'FEED' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
                        {/* Stories */}
                        <div className={`flex gap-3.5 px-3 py-2.5 overflow-x-auto no-scrollbar border-b ${IG.divider}`}>
                            <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => setIsCreatingPost(true)}>
                                <div className="w-[76px] h-[76px] rounded-full relative">
                                    <img src={player.avatar} className="w-full h-full rounded-full object-cover" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#0095f6] border-[3px] border-black flex items-center justify-center">
                                        <Plus size={14} strokeWidth={3} />
                                    </div>
                                </div>
                                <span className="text-[11px] text-white">Your story</span>
                            </div>
                            {npcPool.slice(0, 8).map((npc, i) => (
                                <div key={npc.id} className="flex flex-col items-center gap-1.5 shrink-0">
                                    <StoryRing src={npc.avatar} size="w-[76px] h-[76px]" seen={i > 4} onClick={() => handleNPCClick(npc)} />
                                    <span className="text-[11px] text-white truncate w-[76px] text-center">{npc.handle.replace('@', '')}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pb-16">
                            {feed.length === 0 ? (
                                <div className="py-24 text-center flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center"><Camera size={34} strokeWidth={1.25} /></div>
                                    <div className="font-bold text-xl">Welcome to Instagram</div>
                                    <div className={`text-sm ${IG.muted} max-w-[260px]`}>Follow people to start seeing the photos and videos they share.</div>
                                </div>
                            ) : feed.map(renderPostCard)}
                        </div>
                    </div>
                )}

                {/* SEARCH */}
                {tab === 'SEARCH' && (
                    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar pb-16">
                        {searchQuery.trim() === '' && (
                            <div className="grid grid-cols-3 gap-[2px] mb-2">
                                {feed.slice(0, 12).map(post => (
                                    <button key={`explore_${post.id}`} onClick={() => openPostDetail(post)} className="block active:opacity-70">
                                        <InstagramPostVisual post={post} getPostStyle={getPostStyle} />
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                            <span className="font-semibold text-[15px]">{searchQuery ? 'Accounts' : 'Suggested for you'}</span>
                            {!searchQuery && <span className="text-[13px] font-semibold">See all</span>}
                        </div>
                        <div>
                            {npcPool.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.handle.toLowerCase().includes(searchQuery.toLowerCase())).map(npc => {
                                const isFollowing = npcStates[npc.id]?.isFollowing || false;
                                return (
                                    <div key={npc.id} onClick={() => handleNPCClick(npc)} className="flex items-center gap-3 px-4 py-2 active:bg-[#121212] transition-colors cursor-pointer">
                                        <img src={npc.avatar} className="w-[54px] h-[54px] rounded-full object-cover" />
                                        <div className="flex-1 min-w-0 leading-tight">
                                            <div className="font-semibold text-[14px] flex items-center gap-1 truncate">
                                                {npc.handle.replace('@', '')}
                                                {npc.tier === 'A_LIST' && <VerifiedBadge />}
                                            </div>
                                            <div className={`text-[13px] ${IG.muted} truncate`}>{npc.name}</div>
                                            <div className={`text-[12px] ${IG.muted}`}>{formatFollowers(npc.followers)} followers</div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onFollow(npc); }}
                                            className={`px-5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${isFollowing ? 'bg-[#363636] text-white' : 'bg-[#0095f6] text-white'}`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* PROFILE */}
                {tab === 'PROFILE' && (
                    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar pb-16">
                        <div className="px-4 pt-3">
                            <div className="flex items-center gap-6">
                                <div className="relative shrink-0">
                                    <StoryRing src={player.avatar} size="w-[86px] h-[86px]" seen />
                                    <button onClick={() => setIsCreatingPost(true)} className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#0095f6] border-[3px] border-black flex items-center justify-center">
                                        <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="flex flex-1 justify-around text-center">
                                    <div><div className="font-bold text-[17px]">{posts.length}</div><div className="text-[13px]">posts</div></div>
                                    <div><div className="font-bold text-[17px]">{formatFollowers(publicFollowers)}</div><div className="text-[13px]">followers</div></div>
                                    <div><div className="font-bold text-[17px]">{followingCount}</div><div className="text-[13px]">following</div></div>
                                </div>
                            </div>
                            <div className="mt-3 text-[14px] leading-snug">
                                <div className="font-semibold">{player.name}</div>
                                <div className={IG.muted}>Actor</div>
                                <div>Actor 🎭 | Dreamer ✨</div>
                                <div className="text-[#e0f1ff]">Week {player.currentWeek} • {player.instagram.weeklyPostCount}/3 posts this week</div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button className="flex-1 py-[7px] rounded-lg bg-[#363636] text-[14px] font-semibold">Edit profile</button>
                                <button className="flex-1 py-[7px] rounded-lg bg-[#363636] text-[14px] font-semibold">Share profile</button>
                                <button onClick={handleOpenDMInbox} className="w-10 rounded-lg bg-[#363636] flex items-center justify-center"><Send size={16} className="-rotate-12" /></button>
                            </div>

                            {/* Highlights */}
                            <div className="flex gap-4 mt-4 overflow-x-auto no-scrollbar">
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="w-16 h-16 rounded-full border border-[#363636] flex items-center justify-center"><Plus size={24} strokeWidth={1.5} /></div>
                                    <span className="text-[11px]">New</span>
                                </div>
                                {posts.slice(0, 5).map((p, i) => (
                                    <div key={`hl_${p.id}`} className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="w-16 h-16 rounded-full border border-[#363636] p-[2px] overflow-hidden">
                                            <div className="w-full h-full rounded-full overflow-hidden">
                                                <InstagramPostVisual post={p} getPostStyle={getPostStyle} className="!aspect-auto h-full" />
                                            </div>
                                        </div>
                                        <span className="text-[11px] truncate w-16 text-center">{INSTAGRAM_POST_CONFIGS[p.type]?.shortLabel || `Story ${i + 1}`}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grid tabs */}
                        <div className={`flex mt-4 border-b ${IG.divider}`}>
                            {([['GRID', <Grid size={24} strokeWidth={1.75} />], ['REELS', <Clapperboard size={24} strokeWidth={1.75} />], ['TAGGED', <UserSquare size={24} strokeWidth={1.75} />]] as const).map(([key, icon]) => (
                                <button
                                    key={key}
                                    onClick={() => setProfileGridTab(key)}
                                    className={`flex-1 py-2.5 flex justify-center border-b-[1.5px] -mb-px ${profileGridTab === key ? 'border-white text-white' : 'border-transparent text-[#a8a8a8]'}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>

                        {profileGridTab === 'GRID' && renderProfileGrid(posts, 'Share photos')}
                        {profileGridTab === 'REELS' && renderProfileGrid(posts.filter(p => p.type === 'REEL'), 'Share reels')}
                        {profileGridTab === 'TAGGED' && renderProfileGrid([], 'Photos of you')}
                    </div>
                )}

                {/* Bottom Nav */}
                <div className={`flex items-center border-t ${IG.divider} bg-black pb-5 pt-1 shrink-0`}>
                    <button onClick={() => setTab('FEED')} className="flex-1 py-2 flex justify-center"><Home size={26} strokeWidth={tab === 'FEED' ? 2.5 : 1.75} fill={tab === 'FEED' ? 'white' : 'none'} /></button>
                    <button onClick={() => setTab('SEARCH')} className="flex-1 py-2 flex justify-center"><Search size={26} strokeWidth={tab === 'SEARCH' ? 2.75 : 1.75} /></button>
                    <button onClick={() => setIsCreatingPost(true)} className="flex-1 py-2 flex justify-center"><PlusSquare size={26} strokeWidth={1.75} /></button>
                    <button onClick={() => setTab('FEED')} className="flex-1 py-2 flex justify-center"><Clapperboard size={26} strokeWidth={1.75} /></button>
                    <button onClick={() => setTab('PROFILE')} className="flex-1 py-2 flex justify-center">
                        <div className={`w-7 h-7 rounded-full p-[1.5px] ${tab === 'PROFILE' ? 'bg-white' : 'bg-transparent'}`}>
                            <img src={player.avatar} className="w-full h-full rounded-full object-cover" />
                        </div>
                    </button>
                </div>
            </>
        )}

        {/* ================= DM INBOX ================= */}
        {view === 'DM_LIST' && (
            <div className="flex-1 overflow-y-auto bg-black custom-scrollbar animate-in slide-in-from-right duration-300 pb-8">
                <div className="px-4 pt-3">
                    <div className={`flex items-center gap-2 ${IG.input} rounded-xl px-3 py-2`}>
                        <Search size={16} className={IG.muted} />
                        <span className={`text-[15px] ${IG.muted}`}>Search</span>
                    </div>
                </div>

                {/* Notes rail */}
                <div className="flex gap-4 px-4 py-4 overflow-x-auto no-scrollbar">
                    <div className="flex flex-col items-center gap-1 shrink-0 relative">
                        <div className="absolute -top-3 bg-[#262626] text-[10px] text-[#a8a8a8] px-2.5 py-1.5 rounded-2xl whitespace-nowrap">Note...</div>
                        <img src={player.avatar} className="w-[70px] h-[70px] rounded-full object-cover mt-5" />
                        <span className={`text-[11px] ${IG.muted}`}>Your note</span>
                    </div>
                    {dmContacts.slice(0, 5).map(({ npc }) => (
                        <div key={`note_${npc.id}`} className="flex flex-col items-center gap-1 shrink-0" onClick={() => handleOpenDMThread(npc)}>
                            <img src={npc.avatar} className="w-[70px] h-[70px] rounded-full object-cover mt-5" />
                            <span className="text-[11px] truncate w-[70px] text-center">{npc.name.split(' ')[0]}</span>
                        </div>
                    ))}
                </div>

                <div className="px-4 flex items-center justify-between mb-1">
                    <span className="font-bold text-[16px]">Messages</span>
                    <span className="text-[14px] font-semibold text-[#0095f6]">Requests</span>
                </div>

                {dmContacts.length === 0 ? (
                    <div className={`py-20 text-center flex flex-col items-center gap-3 px-8 ${IG.muted}`}>
                        <div className="w-24 h-24 rounded-full border-2 border-white flex items-center justify-center text-white"><Send size={40} strokeWidth={1.25} className="-rotate-12" /></div>
                        <div className="text-white font-semibold text-lg">Your messages</div>
                        <div className="text-sm leading-relaxed">Send private photos and messages to a friend or group. As your profile grows, celebrities, directors, and brands can message you.</div>
                    </div>
                ) : (
                    <div>
                        {dmContacts.map(({ npc, state }) => {
                            const lastMessage = state.chatHistory[state.chatHistory.length - 1];
                            const hasPending = state.chatHistory.some(msg => msg.sender === 'NPC' && msg.action?.status === 'PENDING');
                            return (
                                <button key={npc.id} onClick={() => handleOpenDMThread(npc)} className="w-full flex items-center gap-3 px-4 py-2 active:bg-[#121212] text-left">
                                    <img src={npc.avatar} className="w-14 h-14 rounded-full object-cover shrink-0" />
                                    <div className="min-w-0 flex-1 leading-tight">
                                        <div className="flex items-center gap-1">
                                            <span className={`truncate text-[14px] ${hasPending ? 'font-bold' : 'font-normal'}`}>{npc.name}</span>
                                            {npc.tier === 'A_LIST' && <VerifiedBadge />}
                                        </div>
                                        <div className={`truncate text-[13px] mt-0.5 ${hasPending ? 'text-white font-semibold' : IG.muted}`}>
                                            {lastMessage?.sender === 'PLAYER' ? 'You: ' : ''}{lastMessage?.text || 'Open conversation'}
                                        </div>
                                    </div>
                                    {hasPending ? <span className="h-2 w-2 rounded-full bg-[#0095f6] shrink-0" /> : <Camera size={22} strokeWidth={1.5} className={`${IG.muted} shrink-0`} />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {/* ================= POST DETAIL ================= */}
        {view === 'POST_DETAIL' && selectedPost && (
            <div className="flex-1 overflow-y-auto bg-black custom-scrollbar animate-in slide-in-from-right duration-300 pb-10">
                <div className="flex items-center gap-3 px-3 py-2.5">
                    <img src={getPostAvatar(selectedPost)} className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex-1 min-w-0 leading-tight">
                        <div className="font-semibold text-[13px] truncate">{selectedPost.authorHandle}</div>
                        <div className={`text-[11px] ${IG.muted}`}>{INSTAGRAM_POST_CONFIGS[selectedPost.type]?.label || selectedPost.type}</div>
                    </div>
                    <MoreHorizontal size={20} />
                </div>

                <InstagramPostVisual post={selectedPost} getPostStyle={getPostStyle} />

                <div className="flex items-center justify-between px-3 pt-3 pb-2">
                    <div className="flex items-center gap-4">
                        <Heart
                            size={26} strokeWidth={1.75}
                            className={`cursor-pointer ${selectedPost.hasLiked ? 'text-[#ff3040]' : 'text-white'}`}
                            fill={selectedPost.hasLiked ? IG.red : 'none'}
                            onClick={() => {
                                onReactPost(selectedPost.id, 'LIKE');
                                setSelectedPost({ ...selectedPost, hasLiked: !selectedPost.hasLiked, likes: Math.max(0, selectedPost.likes + (selectedPost.hasLiked ? -1 : 1)) });
                            }}
                        />
                        <MessageCircle size={26} strokeWidth={1.75} className="-scale-x-100" />
                        <Send size={25} strokeWidth={1.75} />
                    </div>
                    <Bookmark
                        size={26} strokeWidth={1.75}
                        className="cursor-pointer"
                        fill={selectedPost.hasSaved ? 'white' : 'none'}
                        onClick={() => {
                            onReactPost(selectedPost.id, 'SAVE');
                            setSelectedPost({ ...selectedPost, hasSaved: !selectedPost.hasSaved, saves: Math.max(0, (selectedPost.saves || 0) + (selectedPost.hasSaved ? -1 : 1)) });
                        }}
                    />
                </div>

                <div className="px-3 text-[13px] font-semibold">{selectedPost.likes.toLocaleString()} likes</div>
                <div className="px-3 mt-1 text-[13px] leading-snug break-words">
                    <span className="font-semibold mr-1.5">{selectedPost.authorHandle}</span>{selectedPost.caption}
                </div>
                <div className={`px-3 mt-1 text-[10px] uppercase ${IG.muted}`}>Week {selectedPost.week}</div>

                {/* Insights (player posts) */}
                {selectedPost.isPlayer && (
                    <div className={`mx-3 mt-4 rounded-xl ${IG.surface} border ${IG.divider} p-3`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-[14px] flex items-center gap-2"><BarChart3 size={16} /> Insights</span>
                            {selectedPost.engagementScore !== undefined && <span className={`text-[12px] ${IG.muted}`}>Engagement {selectedPost.engagementScore}</span>}
                        </div>
                        <div className="grid grid-cols-4 text-center">
                            {[['Likes', selectedPost.likes], ['Comments', selectedPost.comments], ['Shares', selectedPost.shares || 0], ['Saves', selectedPost.saves || 0]].map(([label, val]) => (
                                <div key={label as string}>
                                    <div className="font-bold text-[16px]">{formatFollowers(val as number)}</div>
                                    <div className={`text-[11px] ${IG.muted}`}>{label}</div>
                                </div>
                            ))}
                        </div>
                        {selectedPost.engagementScore !== undefined && (
                            <div className="h-1 bg-[#262626] rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-[#0095f6]" style={{ width: `${selectedPost.engagementScore}%` }} />
                            </div>
                        )}
                    </div>
                )}

                {/* Comments */}
                <div className={`mt-4 border-t ${IG.divider}`}>
                    <div className="px-3 py-3 font-semibold text-[14px]">Comments</div>
                    {(selectedPost.commentList && selectedPost.commentList.length > 0 ? selectedPost.commentList : ['Love this.', 'Need more posts like this.', 'The feed is alive.']).map((comment, idx) => {
                        const author = getCommentAuthor(selectedPost.type, idx);
                        return (
                            <div key={`${selectedPost.id}_comment_${idx}`} className="flex gap-3 items-start px-3 py-2.5">
                                <img src={`https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(author)}`} className="w-8 h-8 rounded-full bg-[#262626] shrink-0" />
                                <div className="flex-1 min-w-0 text-[13px] leading-snug">
                                    <div><span className="font-semibold mr-1.5">{author}</span><span className="break-words whitespace-pre-wrap">{comment}</span></div>
                                    <div className={`flex gap-4 text-[11px] mt-1 ${IG.muted}`}>
                                        <span>{Math.max(1, 12 - idx * 2)}w</span>
                                        <span>{Math.max(1, (selectedPost.likes >> (4 + idx)) )} likes</span>
                                        <span className="font-semibold">Reply</span>
                                    </div>
                                </div>
                                <Heart size={12} className={`${IG.muted} mt-1 shrink-0`} />
                            </div>
                        );
                    })}
                </div>

                {/* Comment composer */}
                <div className={`sticky bottom-0 bg-black border-t ${IG.divider} px-3 py-2.5 flex items-center gap-3`}>
                    <img src={player.avatar} className="w-8 h-8 rounded-full object-cover" />
                    <div className={`flex-1 ${IG.input} rounded-full px-4 py-2 text-[13px] ${IG.muted}`}>Add a comment for {selectedPost.authorHandle}...</div>
                </div>
            </div>
        )}

        {/* ================= NPC PROFILE ================= */}
        {view === 'NPC_PROFILE' && selectedNPC && (
            <div className="flex-1 overflow-y-auto bg-black custom-scrollbar animate-in slide-in-from-right duration-300 pb-10">
                <div className="px-4 pt-3">
                    <div className="flex items-center gap-6">
                        <StoryRing src={selectedNPC.avatar} size="w-[86px] h-[86px]" onClick={() => {}} />
                        <div className="flex flex-1 justify-around text-center">
                            <div><div className="font-bold text-[17px]">{formatFollowers(selectedNpcPostCount)}</div><div className="text-[13px]">posts</div></div>
                            <div><div className="font-bold text-[17px]">{formatFollowers(selectedNPC.followers)}</div><div className="text-[13px]">followers</div></div>
                            <div><div className="font-bold text-[17px]">{formatFollowers(selectedNpcFollowingCount)}</div><div className="text-[13px]">following</div></div>
                        </div>
                    </div>
                    <div className="mt-3 text-[14px] leading-snug">
                        <div className="font-semibold flex items-center gap-1">{selectedNPC.name} {selectedNPC.tier === 'A_LIST' && <VerifiedBadge size={14} />}</div>
                        <div className={IG.muted}>{isBrand(selectedNPC) ? 'Brand' : selectedNPC.occupation.charAt(0) + selectedNPC.occupation.slice(1).toLowerCase()} • {selectedNPC.tier.replace('_', ' ')}</div>
                        <div className="mt-0.5">{selectedNPC.bio}</div>
                    </div>
                    {npcStates[selectedNPC.id]?.relationshipScore !== undefined && (
                        <div className={`mt-2 text-[12px] ${IG.muted}`}>
                            Relationship: <span className={getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).color}>{getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).label}</span>
                        </div>
                    )}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => onFollow(selectedNPC)}
                            className={`flex-1 py-[7px] rounded-lg text-[14px] font-semibold flex items-center justify-center gap-1 ${npcStates[selectedNPC.id]?.isFollowing ? 'bg-[#363636] text-white' : 'bg-[#0095f6] text-white'}`}
                        >
                            {npcStates[selectedNPC.id]?.isFollowing ? <>Following <ChevronDown size={14} /></> : 'Follow'}
                        </button>
                        <button onClick={handleOpenDM} className="flex-1 py-[7px] bg-[#363636] text-white rounded-lg text-[14px] font-semibold">Message</button>
                        <button className="w-10 rounded-lg bg-[#363636] flex items-center justify-center"><ChevronDown size={16} /></button>
                    </div>
                </div>

                <div className={`flex mt-4 border-b ${IG.divider}`}>
                    <button className="flex-1 py-2.5 flex justify-center border-b-[1.5px] -mb-px border-white"><Grid size={24} strokeWidth={1.75} /></button>
                    <button className="flex-1 py-2.5 flex justify-center text-[#a8a8a8]"><Clapperboard size={24} strokeWidth={1.75} /></button>
                    <button className="flex-1 py-2.5 flex justify-center text-[#a8a8a8]"><UserSquare size={24} strokeWidth={1.75} /></button>
                </div>

                {renderProfileGrid(selectedNpcProfilePosts, 'No posts yet')}
            </div>
        )}

        {/* ================= DM THREAD ================= */}
        {view === 'DM' && selectedNPC && (
            <div className="flex-1 flex flex-col bg-black animate-in slide-in-from-right duration-300 min-h-0">
                <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
                    {/* Contact card */}
                    <div className="flex flex-col items-center text-center py-6 gap-2">
                        <img src={selectedNPC.avatar} className="w-24 h-24 rounded-full object-cover" />
                        <div className="font-semibold text-[16px] flex items-center gap-1">{selectedNPC.name} {selectedNPC.tier === 'A_LIST' && <VerifiedBadge size={14} />}</div>
                        <div className={`text-[13px] ${IG.muted}`}>{selectedNPC.handle} • Instagram</div>
                        <div className={`text-[13px] ${IG.muted}`}>{formatFollowers(selectedNPC.followers)} followers • {formatFollowers(selectedNpcPostCount)} posts</div>
                        <div className="w-full max-w-[240px] mt-2">
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className={getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).color}>{getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).label}</span>
                                <span className={IG.muted}>{npcStates[selectedNPC.id]?.relationshipScore || 0}/100</span>
                            </div>
                            <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).bar}`} style={{ width: `${npcStates[selectedNPC.id]?.relationshipScore || 0}%` }} />
                            </div>
                        </div>
                        <button onClick={() => { setView('NPC_PROFILE'); }} className="mt-2 px-4 py-1.5 bg-[#363636] rounded-lg text-[13px] font-semibold">View profile</button>
                    </div>

                    <div className="space-y-1.5">
                        {npcStates[selectedNPC.id]?.chatHistory?.map((msg, idx) => (
                            <div key={idx} className={`flex items-end gap-2 ${msg.sender === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                                {msg.text === 'Seen' ? (
                                    <div className={`w-full text-right text-[11px] ${IG.muted} pr-1 pt-1`}>Seen</div>
                                ) : (
                                    <>
                                        {msg.sender === 'NPC' && <img src={selectedNPC.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" />}
                                        <div className={`max-w-[75%] px-3.5 py-2 rounded-[22px] text-[14px] break-words ${msg.sender === 'PLAYER' ? 'bg-[#3797f0] text-white' : 'bg-[#262626] text-white'}`}>
                                            <div className="leading-snug whitespace-pre-wrap">{msg.text}</div>
                                            {msg.sender === 'NPC' && msg.action && (
                                                <div className="mt-2.5 rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                                                    <div className="px-3 py-2 border-b border-white/10">
                                                        <div className="text-[12px] font-semibold">{getDmActionTitle(msg.action.kind)}</div>
                                                        <div className={`text-[11px] mt-0.5 ${IG.muted}`}>{getDmActionDetails(msg.action)}</div>
                                                    </div>
                                                    {msg.action.status === 'PENDING' ? (
                                                        <div className="grid grid-cols-2 divide-x divide-white/10">
                                                            <button onClick={() => onRespondDM(selectedNPC, msg.action!.id, true)} className="py-2.5 text-[13px] font-semibold text-[#0095f6]">
                                                                {msg.action.kind === 'IG_BRAND_OFFER' ? 'Accept' : msg.action.kind === 'IG_REFERRAL' ? 'Accept' : 'Reply'}
                                                            </button>
                                                            <button onClick={() => onRespondDM(selectedNPC, msg.action!.id, false)} className="py-2.5 text-[13px] font-semibold text-[#ff3040]">Decline</button>
                                                        </div>
                                                    ) : (
                                                        <div className={`py-2 text-center text-[12px] font-semibold ${msg.action.status === 'ACCEPTED' ? 'text-emerald-400' : IG.muted}`}>
                                                            {msg.action.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    <div ref={chatEndRef} />
                </div>

                {/* Composer / actions */}
                <div className="px-3 pb-5 pt-2 bg-black shrink-0">
                    {selectedPendingDmAction ? (
                        <div className={`rounded-2xl ${IG.surface} border ${IG.divider} p-3 text-[13px] leading-snug flex gap-2`}>
                            <Info size={16} className="text-[#0095f6] shrink-0 mt-0.5" />
                            <span className={IG.muted}>Reply to the pending {getDmActionTitle(selectedPendingDmAction.kind).toLowerCase()} above first. Quick chat is paused so you don't accidentally dodge an offer.</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                {[
                                    { label: 'Greet', sub: '-5E', icon: <MessageCircle size={14} />, type: 'GREET' as InteractionType, disabled: player.energy.current < 5 },
                                    { label: 'Compliment', sub: 'Rel 20+ • -10E', icon: <Sparkles size={14} />, type: 'COMPLIMENT' as InteractionType, disabled: player.energy.current < 10 || (npcStates[selectedNPC.id]?.relationshipScore || 0) < 20 },
                                    { label: 'Coffee', sub: 'Rel 40+ • -15E', icon: <Coffee size={14} />, type: 'COFFEE' as InteractionType, disabled: player.energy.current < 15 || (npcStates[selectedNPC.id]?.relationshipScore || 0) < 40 },
                                    { label: 'Collab', sub: 'Rel 60+ • -20E', icon: <Briefcase size={14} />, type: 'COLLAB' as InteractionType, disabled: player.energy.current < 20 || (npcStates[selectedNPC.id]?.relationshipScore || 0) < 60 }
                                ].map(a => (
                                    <button
                                        key={a.type}
                                        onClick={() => onInteract(selectedNPC, a.type)}
                                        disabled={a.disabled}
                                        className="shrink-0 flex items-center gap-2 bg-[#262626] rounded-full pl-3 pr-4 py-2 text-[13px] disabled:opacity-40 active:scale-95 transition-transform"
                                    >
                                        <span className="text-[#0095f6]">{a.icon}</span>
                                        <span className="font-semibold">{a.label}</span>
                                        <span className={`text-[10px] ${IG.muted}`}>{a.sub}</span>
                                    </button>
                                ))}
                            </div>
                            <div className={`flex items-center gap-2 ${IG.input} rounded-full pl-1.5 pr-3 py-1.5`}>
                                <div className="w-9 h-9 rounded-full bg-[#3797f0] flex items-center justify-center shrink-0"><Camera size={18} /></div>
                                <span className={`flex-1 text-[14px] ${IG.muted}`}>Message...</span>
                                <Images size={22} strokeWidth={1.75} />
                                <Smile size={22} strokeWidth={1.75} />
                            </div>
                        </>
                    )}
                    {!selectedPendingDmAction && (npcStates[selectedNPC.id]?.relationshipScore || 0) >= 80 && !(npcStates[selectedNPC.id]?.hasMet) && (
                        <button onClick={() => onInteract(selectedNPC, 'BEFRIEND')} className="w-full mt-2 py-2.5 bg-[#0095f6] text-white font-semibold rounded-lg text-[14px] flex items-center justify-center gap-2 animate-in slide-in-from-bottom">
                            <Handshake size={16} /> Befriend & Add to Network
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* ================= NEW POST ================= */}
        {isCreatingPost && (
            <div className="absolute inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                <div className={`flex justify-between items-center px-4 pt-12 pb-3 border-b ${IG.divider} shrink-0`}>
                    <button onClick={closeCreator} className="p-1 -ml-1"><X size={26} /></button>
                    <h3 className="font-bold text-[16px]">New post</h3>
                    <button
                        onClick={handleCreatePost}
                        disabled={isImageProcessing}
                        className="text-[#0095f6] font-semibold text-[15px] disabled:opacity-50"
                    >
                        {isImageProcessing ? 'Sharing…' : 'Share'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black pb-10">
                    {/* Preview */}
                    <div className={`aspect-square relative overflow-hidden flex items-center justify-center ${imageSourceUrl ? 'bg-black' : getPostStyle(selectedPresetType)}`}>
                        {imageSourceUrl ? (
                            <img
                                src={imageSourceUrl}
                                alt="Selected Instagram post"
                                className={imageImageClass(imageFitMode)}
                                style={imageImageStyle(imageZoom, imageOffsetX, imageOffsetY)}
                            />
                        ) : (
                            <>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_80%_75%,rgba(0,0,0,0.25),transparent_32%)]" />
                                <div className="relative z-10 text-center px-6">
                                    <div className="text-white/90 font-black text-4xl uppercase tracking-tight drop-shadow-xl">{selectedConfig.shortLabel}</div>
                                    <div className="text-[11px] text-white/70 mt-2">Generated visual · tap to add your own photo</div>
                                </div>
                            </>
                        )}
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            className="absolute left-3 bottom-3 rounded-full bg-black/70 backdrop-blur border border-white/15 px-3 py-2 text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                        >
                            <ImagePlus size={14} /> {imageSourceUrl ? 'Change photo' : 'Add photo'}
                        </button>
                        {imageSourceUrl && (
                            <button
                                onClick={() => setImageFitMode(imageFitMode === 'cover' ? 'contain' : 'cover')}
                                className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-black/70 backdrop-blur border border-white/15 flex items-center justify-center"
                                title="Toggle fit"
                            >
                                <Settings2 size={16} />
                            </button>
                        )}
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
                    </div>

                    {imageSourceUrl && (
                        <div className={`px-4 py-3 border-b ${IG.divider} space-y-3`}>
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-semibold">Adjust ({imageFitMode === 'cover' ? 'Fill' : 'Fit'})</span>
                                <button onClick={resetImageDraft} className="text-[13px] text-[#ff3040] font-semibold">Remove</button>
                            </div>
                            {[
                                { label: 'Zoom', value: imageZoom, min: 1, max: 2.4, step: 0.05, onChange: setImageZoom },
                                { label: 'Horizontal', value: imageOffsetX, min: -320, max: 320, step: 5, onChange: setImageOffsetX },
                                { label: 'Vertical', value: imageOffsetY, min: -320, max: 320, step: 5, onChange: setImageOffsetY }
                            ].map(control => (
                                <label key={control.label} className="flex items-center gap-3">
                                    <span className={`w-20 text-[12px] ${IG.muted}`}>{control.label}</span>
                                    <input
                                        type="range" min={control.min} max={control.max} step={control.step} value={control.value}
                                        onChange={(e) => control.onChange(Number(e.target.value))}
                                        className="flex-1 accent-white"
                                    />
                                </label>
                            ))}
                        </div>
                    )}

                    {imageError && <div className="mx-4 mt-3 rounded-lg bg-[#ff3040]/10 border border-[#ff3040]/30 p-3 text-[13px] text-[#ff6b7a]">{imageError}</div>}

                    {/* Caption */}
                    <div className={`flex gap-3 px-4 py-3 border-b ${IG.divider}`}>
                        <img src={player.avatar} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <textarea
                            value={postCaption}
                            onChange={(e) => setPostCaption(e.target.value)}
                            placeholder="Write a caption..."
                            className="flex-1 bg-transparent text-white placeholder:text-[#a8a8a8] focus:outline-none min-h-[80px] text-[14px] resize-none"
                        />
                    </div>

                    {/* Settings rows */}
                    <div className={`border-b ${IG.divider}`}>
                        <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
                            <span>Post type</span>
                            <span className={`flex items-center gap-1 ${IG.muted}`}>{selectedConfig.label} <ChevronDown size={16} className="-rotate-90" /></span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
                            <span>Energy cost</span>
                            <span className={`flex items-center gap-1 ${IG.muted}`}><Zap size={14} className="text-amber-400" /> {selectedConfig.energy}E</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
                            <span>Posts this week</span>
                            <span className={IG.muted}>{player.instagram.weeklyPostCount}/3</span>
                        </div>
                    </div>

                    {/* Post type picker */}
                    <div className="px-4 pt-4 pb-2">
                        <div className="text-[13px] font-semibold">Choose post style</div>
                        <div className={`text-[12px] ${IG.muted} mt-0.5`}>Style affects reach, fan reaction, and event chances.</div>
                    </div>
                    <div>
                        {postTypeOptions.map(option => {
                            const isSelected = selectedPresetType === option.type;
                            const isLocked = Boolean(option.lockReason);
                            return (
                                <button
                                    key={option.type}
                                    onClick={() => { if (!isLocked) setSelectedPresetType(option.type); }}
                                    disabled={isLocked}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#121212] ${isLocked ? 'opacity-40' : ''}`}
                                >
                                    <div className={`h-11 w-11 rounded-full flex items-center justify-center ${INSTAGRAM_POST_CONFIGS[option.type]?.colorClass || 'bg-zinc-800'}`}>
                                        {isLocked ? <Lock size={16} /> : option.icon}
                                    </div>
                                    <div className="min-w-0 flex-1 leading-tight">
                                        <div className="font-semibold text-[14px] truncate">{option.title}</div>
                                        <div className={`text-[12px] ${IG.muted} truncate`}>{option.lockReason || option.subtitle}</div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#0095f6] border-[#0095f6]' : 'border-[#555]'}`}>
                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className={`mx-4 mt-3 text-[12px] ${IG.muted} leading-relaxed`}>
                        <span className={`font-semibold ${selectedConfig.accentClass}`}>{selectedConfig.label}: </span>
                        {selectedConfig.description}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};