
import React, { useEffect, useState } from 'react';
import { Player, Commitment, InstaPostType, NPCActor, InteractionType, Agent, Manager, Message, SponsorshipActionType, AuditionOpportunity, DatingMatch, InstaPost, Relationship, SponsorshipOffer, NegotiationData, ContractFilm, YoutubeBrandDeal, YoutubeCollabOffer, PregnancyCarrier } from '../../types';
import { MessageSquare, Search, BarChart3, Camera, Users, Newspaper, TrendingUp, Activity, Heart, Folder, Flame, Gem, Landmark, X, CheckCircle, AlertCircle, BookOpen, Map, Tv, Radio } from 'lucide-react';
import { getPhaseDuration } from '../../services/roleLogic';

// Import sub-apps
import { InstagramApp } from './InstagramApp';
import { BoxOfficeHub } from './boxoffice';
import { CastLinkApp } from './CastLinkApp';
import { MessagesApp } from './MessagesApp';
import { TeamApp } from './TeamApp';
import { NewsApp } from './NewsApp';
import { ImdbApp } from './ImdbApp';
import { ForbesApp } from './ForbesApp';
import { StocksApp } from './StocksApp';
import { DatingFolder } from './DatingFolder';
import { SocialFolder } from './SocialFolder';
import { TinderApp } from './TinderApp';
import { LuxeApp } from './LuxeApp';
import { BankApp } from './BankApp';
import { XApp } from './XApp';
import { YoutubeApp } from './YoutubeApp';
import { GuideView } from '../../components/GuideView'; // Imported GuideView
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { normalizeUniverseMap } from '../../services/universeLogic';
import { getPlayerLanguage, t } from '../../services/i18n';
import { StreamingPage } from './StreamingPage';
import { OwnPlatformApp } from '../ownPlatform/OwnPlatformApp';
import { armPlatformIdent } from '../../services/ownPlatform/identAudio';
import './phoneDesk.css';

const AppIcon = ({ icon, color, label, onClick, badge, customContent, customBg }: any) => (
    <button type="button" className="phn-app" onClick={onClick}>
        <span className={`phn-ico ${customBg || color} relative text-white`}>
            {customContent ? customContent : icon}
            {badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-black bg-rose-500 px-1 text-[10px] font-bold">
                    {badge}
                </span>
            )}
        </span>
        <span>{label}</span>
    </button>
);

export type PhoneAppId = 'HOME' | 'CASTLINK' | 'IMDB' | 'BOXOFFICE' | 'STREAMING' | 'OWN_PLATFORM' | 'INSTAGRAM' | 'X' | 'YOUTUBE' | 'NEWS' | 'TEAM' | 'MESSAGES' | 'FORBES' | 'STOCKS' | 'DATING_FOLDER' | 'SOCIAL_FOLDER' | 'TINDER' | 'LUXE' | 'BANK' | 'GUIDE';
export type PhoneLaunch = { app: PhoneAppId; pane?: 'launch' | 'build' | 'rights' | 'ops' | 'world' };

interface MobilePageProps {
  player?: Player;
  onAudition?: (opportunity: AuditionOpportunity) => void;
  onTakeJob?: (job: Commitment) => void;
  onQuitJob?: (id: string) => void;
  onPost?: (type: InstaPostType, caption: string, image?: string) => void;
  onReactInstagramPost?: (postId: string, action: 'LIKE' | 'SAVE') => void;
  onRespondInstagramDM?: (npc: NPCActor, actionId: string, accepted: boolean) => void;
  onFollowNPC?: (npc: NPCActor) => void;
  onInteractNPC?: (npc: NPCActor, type: InteractionType) => void;
  onBefriendNPC?: (npc: NPCActor) => void;
  onHireAgent?: (agent: Agent) => void;
  onFireAgent?: () => void;
  onHireManager?: (manager: Manager) => void;
  onFireManager?: () => void;
  onAcceptMessage?: (msg: Message) => void;
  onPerformSponsorship?: (sponId: string, action: SponsorshipActionType) => void;
  onDeleteMessage?: (id: string) => void;
  onTradeStock?: (stockId: string, amount: number) => void;
  onFoundCompany?: () => void;
  onAcquirePlatform?: (stockId: string, financing: import('../../services/ownPlatform/valuation').BuyFinancing) => void;
  onUpdatePlayer?: (player: Player) => void;
  launchApp?: PhoneLaunch | null;
  onLaunchConsumed?: () => void;
  onTriggerBabyNaming?: (pending: {
      partnerId: string;
      partnerName: string;
      pregnancyCarrier?: PregnancyCarrier;
      babyGender: 'MALE' | 'FEMALE';
      suggestedFirstName: string;
      birthWeekAbsolute: number;
      eventWeek: number;
      eventYear: number;
      shouldCreateScandalNews: boolean;
  }) => void;
}

export const MobilePage: React.FC<MobilePageProps> = (props) => {
  const [appMode, setAppMode] = useState<PhoneAppId>('HOME');
  const [platformPane, setPlatformPane] = useState<'launch' | 'build' | 'rights' | 'ops' | 'world'>('launch');
  const [toast, setToast] = useState<{msg: string, color: string} | null>(null);

  useEffect(() => {
      if (!props.launchApp) return;
      setAppMode(props.launchApp.app);
      if (props.launchApp.pane) setPlatformPane(props.launchApp.pane);
      props.onLaunchConsumed?.();
  }, [props.launchApp]);

  if (!props.player) return null; 

  const language = getPlayerLanguage(props.player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const unreadMessages = props.player.inbox?.filter(m => !m.isRead).length || 0;
  const handleUpdatePlayer = props.onUpdatePlayer || ((p: Player) => {});

  const showToast = (msg: string, color: string = 'bg-emerald-500') => {
      setToast({ msg, color });
      setTimeout(() => setToast(null), 3000);
  };

  const handleMarkMessageRead = (id: string) => {
      const updatedInbox = props.player!.inbox.map(message =>
          message.id === id ? { ...message, isRead: true } : message
      );
      handleUpdatePlayer({ ...props.player!, inbox: updatedInbox });
  };

  // --- HANDLER: Accept Offers (Modified for Multi-Film) ---
  const handleAcceptMessage = (msg: Message) => {
      // 1. Remove message from inbox
      const newInbox = props.player!.inbox.filter(m => m.id !== msg.id);
      let updatedPlayer = { ...props.player!, inbox: newInbox };

      // 2. Process Logic based on Type
      if (msg.type === 'OFFER_ROLE' || msg.type === 'OFFER_NEGOTIATION') {
          let opp: AuditionOpportunity;
          let salary = 0;
          let royalty = 0;

          if (msg.type === 'OFFER_NEGOTIATION') {
              const data = msg.data as NegotiationData;
              if (!data?.opportunity) {
                  showToast(tr('mobile.toast.missingContract'), "bg-rose-500");
                  handleUpdatePlayer(updatedPlayer);
                  return;
              }
              opp = data.opportunity;
              salary = data.currentOffer;
              royalty = data.royaltyPercentage || 0;
          } else {
              if (!msg.data) {
                  showToast(tr('mobile.toast.missingProject'), "bg-rose-500");
                  handleUpdatePlayer(updatedPlayer);
                  return;
              }
              opp = msg.data as AuditionOpportunity;
              salary = opp.estimatedIncome;
              royalty = opp.royaltyPercentage || 0;
          }

          // FIX: Register Famous Movie to prevent duplicate offers
          if (opp.project.isFamous) {
              if (!updatedPlayer.world) {
                  updatedPlayer.world = { projects: [], trendingGenre: 'ACTION', universes: {}, famousMoviesReleased: [], awardHistory: [], upcomingRivals: [] };
              }
              if (!Array.isArray(updatedPlayer.world.famousMoviesReleased)) {
                  updatedPlayer.world.famousMoviesReleased = [];
              }
              if (!updatedPlayer.world.famousMoviesReleased.includes(opp.projectName)) {
                  updatedPlayer.world.famousMoviesReleased.push(opp.projectName);
              }
          }

          const newCommitments: Commitment[] = [];

          // CHECK FOR UNIVERSE CONTRACT (Multi-Film)
          if (opp.universeContract) {
              const contract = opp.universeContract;
              
              // We split the salary across the films for simplicity, or give signing bonus now
              // Let's give 20% signing bonus now, rest per film
              const signingBonus = Math.floor(salary * 0.2);
              const perFilmSalary = Math.floor((salary - signingBonus) / contract.films.length);
              
              // Immediate payout
              updatedPlayer.money += signingBonus;
              updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Signed Multi-Picture Deal! Bonus: $${signingBonus.toLocaleString()}`, type: 'positive' });
              updatedPlayer.activeUniverseContract = contract;

              // --- NEW: UPDATE ROSTER IN WORLD STATE ---
              if (updatedPlayer.world && updatedPlayer.world.universes) {
                  const uniId = contract.universeId;
                  const newUniverses = normalizeUniverseMap(updatedPlayer.world.universes);
                  if (newUniverses[uniId]) {
                      const newRoster = newUniverses[uniId].roster.map(char => {
                          if (char.name === contract.characterName) {
                              return { ...char, actorId: props.player!.id, actorName: props.player!.name };
                          }
                          return char;
                      });
                      newUniverses[uniId] = { ...newUniverses[uniId], roster: newRoster };
                      updatedPlayer.world = { ...updatedPlayer.world, universes: newUniverses };
                  }
              }
              // -----------------------------------------

              contract.films.forEach((film, index) => {
                  const isFirst = index === 0;
                  
                  // Clone project details but update title/role for specific film
                  const filmDetails = { 
                      ...opp.project, 
                      title: film.title, 
                      subtype: film.type 
                  };

                  const newComm: Commitment = {
                      id: `uni_job_${Date.now()}_${index}`,
                      name: film.title,
                      type: 'ACTING_GIG',
                      roleType: film.role,
                      energyCost: 0, 
                      income: 0,
                      lumpSum: perFilmSalary,
                      payoutType: 'LUMPSUM',
                      projectDetails: filmDetails,
                      // First movie starts now, others are SCHEDULED
                      projectPhase: isFirst ? 'PRE_PRODUCTION' : 'SCHEDULED', 
                      phaseWeeksLeft: isFirst ? getPhaseDuration('PRE_PRODUCTION') : film.weeksOffset, // Use offset as waiting time
                      totalPhaseDuration: isFirst ? getPhaseDuration('PRE_PRODUCTION') : film.weeksOffset,
                      auditionPerformance: 100, 
                      productionPerformance: 50,
                      agentCommission: props.player!.team.agent?.commission || 0,
                      royaltyPercentage: royalty
                  };
                  newCommitments.push(newComm);
              });

          } else {
              // STANDARD SINGLE FILM
              const newCommitment: Commitment = {
                  id: `job_${Date.now()}`,
                  name: opp.projectName,
                  type: 'ACTING_GIG',
                  roleType: opp.roleType,
                  energyCost: 0,
                  income: 0,
                  lumpSum: salary,
                  payoutType: 'LUMPSUM',
                  projectDetails: opp.project,
                  projectPhase: 'PRE_PRODUCTION', 
                  phaseWeeksLeft: getPhaseDuration('PRE_PRODUCTION'),
                  totalPhaseDuration: getPhaseDuration('PRE_PRODUCTION'),
                  auditionPerformance: 100,
                  productionPerformance: 50,
                  agentCommission: props.player!.team.agent?.commission || 0,
                  royaltyPercentage: royalty
              };
              newCommitments.push(newCommitment);
              updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Accepted role in "${opp.projectName}"!`, type: 'positive' });
          }

          updatedPlayer.commitments = [...updatedPlayer.commitments, ...newCommitments];
      } 
      else if (msg.type === 'OFFER_SPONSORSHIP') {
          const offer = msg.data as SponsorshipOffer;
          if (!offer) {
              showToast(tr('mobile.toast.missingSponsor'), "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }
          // Add to active sponsorships
          updatedPlayer.activeSponsorships = [...updatedPlayer.activeSponsorships, { ...offer, weeksCompleted: 0 }];
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Signed sponsorship deal with ${offer.brandName}.`, type: 'positive' });
      } else if (msg.type === 'OFFER_YOUTUBE_COLLAB') {
          const offer = msg.data as YoutubeCollabOffer;
          if (!offer) {
              showToast(tr('mobile.toast.missingCollab'), "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }
          updatedPlayer.youtube = {
              ...updatedPlayer.youtube,
              activeCollabs: [...(updatedPlayer.youtube.activeCollabs || []), offer]
          };
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Locked in a YouTube collab with ${offer.creatorName}.`, type: 'positive' });
      } else if (msg.type === 'OFFER_YOUTUBE_BRAND') {
          const offer = msg.data as YoutubeBrandDeal;
          if (!offer) {
              showToast(tr('mobile.toast.missingYoutubeDeal'), "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }
          updatedPlayer.youtube = {
              ...updatedPlayer.youtube,
              activeBrandDeals: [...(updatedPlayer.youtube.activeBrandDeals || []), offer]
          };
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Accepted a YouTube integration deal with ${offer.brandName}.`, type: 'positive' });
      }

      // 3. Update Player
      handleUpdatePlayer(updatedPlayer);
      showToast(tr('mobile.toast.offerAccepted'));
  };

  // --- HANDLER: Perform Sponsorship ---
  const handlePerformSponsorship = (sponId: string, action: SponsorshipActionType) => {
      const sponIndex = props.player!.activeSponsorships.findIndex(s => s.id === sponId);
      if (sponIndex === -1) return;
      
      const spon = props.player!.activeSponsorships[sponIndex];
      
      // Energy Check
      if (props.player!.energy.current < spon.requirements.energyCost) {
          showToast(tr('mobile.toast.notEnoughEnergy'), "bg-rose-500");
          return;
      }

      // Update Logic - Increment PROGRESS, not just period count
      const updatedSpon = { ...spon };
      updatedSpon.requirements = {
          ...spon.requirements,
          progress: (spon.requirements.progress || 0) + 1
      };

      const updatedSponsorships = [...props.player!.activeSponsorships];
      updatedSponsorships[sponIndex] = updatedSpon;

      const updatedPlayer = {
          ...props.player!,
          activeSponsorships: updatedSponsorships
      };
      spendPlayerEnergy(updatedPlayer, spon.requirements.energyCost);

      handleUpdatePlayer(updatedPlayer);
      showToast(action === 'POST' ? tr('mobile.toast.postComplete') : tr('mobile.toast.shootComplete'), 'bg-blue-500');
  };

  const handleTinderDateSuccess = (match: DatingMatch) => {
      const newMatches = props.player!.dating.matches.filter(m => m.id !== match.id);
      const newRel: Relationship = {
          id: `rel_${match.id}`,
          name: match.name,
          relation: 'Partner',
          closeness: 40 + Math.floor(Math.random() * 20),
          image: match.image,
          lastInteractionWeek: props.player!.currentWeek,
          lastInteractionAbsolute: getAbsoluteWeek(props.player!.age, props.player!.currentWeek),
          npcId: match.npcId,
          age: match.age
      };
      
      handleUpdatePlayer({
          ...props.player!,
          dating: { ...props.player!.dating, matches: newMatches },
          relationships: [...props.player!.relationships, newRel],
          logs: [...props.player!.logs, { week: props.player!.currentWeek, year: props.player!.age, message: `You started dating ${match.name}!`, type: 'positive' }]
      });
  };

  // --- NEW HANDLERS: HIRE AGENT/MANAGER (Strict Money Check) ---
  const handleHireAgent = (agent: Agent) => {
      if (props.player!.money < agent.annualFee) {
          showToast(tr('mobile.toast.insufficientFunds'), "bg-rose-500");
          return;
      }
      handleUpdatePlayer({
          ...props.player!,
          money: props.player!.money - agent.annualFee,
          team: {
              ...props.player!.team,
              agent,
              availableAgents: (props.player!.team.availableAgents || []).filter(candidate => candidate.id !== agent.id)
          },
          logs: [...props.player!.logs, { 
              week: props.player!.currentWeek, 
              year: props.player!.age, 
              message: `Hired ${agent.name}. Paid annual fee of $${agent.annualFee.toLocaleString()}.`, 
              type: 'neutral' 
          }]
      });
      showToast(tr('mobile.toast.agentHired'), "bg-emerald-500");
  };

  const handleHireManager = (manager: Manager) => {
      if (props.player!.money < manager.annualFee) {
          showToast(tr('mobile.toast.insufficientFunds'), "bg-rose-500");
          return;
      }
      handleUpdatePlayer({
          ...props.player!,
          money: props.player!.money - manager.annualFee,
          team: {
              ...props.player!.team,
              manager,
              availableManagers: (props.player!.team.availableManagers || []).filter(candidate => candidate.id !== manager.id)
          },
          logs: [...props.player!.logs, { 
              week: props.player!.currentWeek, 
              year: props.player!.age, 
              message: `Hired ${manager.name}. Paid annual fee of $${manager.annualFee.toLocaleString()}.`, 
              type: 'neutral' 
          }]
      });
      showToast(tr('mobile.toast.managerHired'), "bg-emerald-500");
  };

  const deskApps: { id: PhoneAppId; label: string; pane?: 'launch' | 'build' | 'rights' | 'ops' | 'world' }[] = [
      { id: 'MESSAGES', label: tr('mobile.messages') },
      { id: 'CASTLINK', label: 'CastLink' },
      { id: 'SOCIAL_FOLDER', label: tr('mobile.social') },
      { id: 'NEWS', label: tr('mobile.news') },
      { id: 'IMDB', label: 'IMDb' },
      { id: 'BOXOFFICE', label: tr('mobile.boxOffice') },
      { id: 'STREAMING', label: tr('mobile.streaming') },
      { id: 'OWN_PLATFORM', label: 'Empire+', pane: 'launch' },
      { id: 'TEAM', label: tr('mobile.team') },
      { id: 'BANK', label: tr('mobile.bank') },
      { id: 'FORBES', label: tr('mobile.forbes') },
      { id: 'STOCKS', label: tr('mobile.stocks') },
      { id: 'DATING_FOLDER', label: tr('mobile.dating') },
      { id: 'GUIDE', label: tr('mobile.guide') },
  ];

  const openDesk = (app: PhoneAppId, pane?: 'launch' | 'build' | 'rights' | 'ops' | 'world') => {
      if (pane) setPlatformPane(pane);
      setAppMode(app);
  };

  const unreadNotes = (props.player.inbox || []).filter(message => !message.isRead).slice(0, 4);
  return (
    <div className={`phn-layout ${unreadNotes.length ? 'has-notes' : ''}`}>
        <aside className="phn-side">
            <button type="button" onClick={() => setAppMode('HOME')} className={appMode === 'HOME' ? 'is-on' : ''}>Home screen</button>
            {deskApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    onClick={() => openDesk(app.id, app.pane)}
                    className={appMode === app.id ? 'is-on' : ''}
                >
                    {app.label}{app.id === 'MESSAGES' && unreadMessages > 0 ? ` (${unreadMessages})` : ''}
                </button>
            ))}
        </aside>
        <div className="phn-device">
            <div className="phn-screen">
                <div className="phn-status">
                    <span>12:45</span>
                    <span className="tracking-[0.2em] text-[10px] text-white/70">IG</span>
                </div>

                {/* TOAST NOTIFICATION (Inside Phone Screen for better Z-index/Visibility) */}
                {toast && (
                    <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-[100] ${toast.color} text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top fade-in w-max max-w-[90%] justify-center border border-white/10`}>
                        {toast.color.includes('rose') ? <AlertCircle size={16} /> : <CheckCircle size={16} />} 
                        {toast.msg}
                    </div>
                )}

                {/* HOME SCREEN */}
                {appMode === 'HOME' && (
                    <div className="phn-home">
                        <div className="phn-grid">
                            <AppIcon 
                                icon={<MessageSquare size={26} fill="white" />} 
                                color="bg-green-500" 
                                label={tr('mobile.messages')} 
                                onClick={() => setAppMode('MESSAGES')} 
                                badge={unreadMessages} 
                            />
                            <AppIcon 
                                icon={<Search size={26} />} 
                                color="bg-indigo-600" 
                                label="CastLink" 
                                onClick={() => setAppMode('CASTLINK')} 
                            />
                            
                            {/* SOCIAL FOLDER */}
                            <button type="button" className="phn-app" onClick={() => setAppMode('SOCIAL_FOLDER')}>
                                <span className="phn-ico grid grid-cols-2 gap-0.5 bg-white/15 p-1.5">
                                    <div className="w-full h-full bg-black flex items-center justify-center rounded-[5px] shadow-sm border border-zinc-700">
                                        <X size={12} strokeWidth={3} className="text-white"/>
                                    </div>
                                    <div className="w-full h-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-[5px] flex items-center justify-center shadow-sm">
                                        <Camera size={12} className="text-white"/>
                                    </div>
                                    <div className="w-full h-full bg-[#FF0000] rounded-[5px] flex items-center justify-center shadow-sm">
                                        <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
                                    </div>
                                    <span className="h-full w-full" />
                                </span>
                                <span>{tr('mobile.social')}</span>
                            </button>

                            <AppIcon 
                                icon={<Newspaper size={26} />} 
                                color="bg-red-600" 
                                label={tr('mobile.news')} 
                                onClick={() => setAppMode('NEWS')} 
                            />
                            <AppIcon 
                                label="IMDb" 
                                color="bg-yellow-400" 
                                onClick={() => setAppMode('IMDB')} 
                                customContent={<span className="font-black text-xs tracking-tighter border-2 border-black px-1 rounded text-black">IMDb</span>}
                            />
                            <AppIcon 
                                icon={<BarChart3 size={26} />} 
                                color="bg-emerald-600" 
                                label={tr('mobile.boxOffice')} 
                                onClick={() => setAppMode('BOXOFFICE')} 
                            />
                            <AppIcon
                                icon={<Tv size={26} />}
                                color="bg-indigo-600"
                                label={tr('mobile.streaming')}
                                onClick={() => setAppMode('STREAMING')}
                            />
                            <AppIcon
                                icon={<Radio size={26} />}
                                color="bg-[#ff3b30]"
                                label="Empire+"
                                onClick={() => { armPlatformIdent(props.player); setPlatformPane('launch'); setAppMode('OWN_PLATFORM'); }}
                            />
                            <AppIcon 
                                icon={<Users size={26} />} 
                                color="bg-blue-500" 
                                label={tr('mobile.team')} 
                                onClick={() => setAppMode('TEAM')} 
                            />
                            <AppIcon 
                                icon={<Landmark size={26} />} 
                                color="bg-[#004b87]" 
                                label={tr('mobile.bank')} 
                                onClick={() => setAppMode('BANK')} 
                            />
                            <AppIcon 
                                icon={<TrendingUp size={26} />} 
                                color="bg-black" 
                                label={tr('mobile.forbes')} 
                                onClick={() => setAppMode('FORBES')}
                                customContent={<span className="font-serif font-black text-xs tracking-tighter text-white">FORBES</span>} 
                            />
                            <AppIcon 
                                icon={<Activity size={26} />} 
                                color="bg-zinc-800" 
                                label={tr('mobile.stocks')} 
                                onClick={() => setAppMode('STOCKS')} 
                            />
                            
                            {/* DATING FOLDER */}
                            <button type="button" className="phn-app" onClick={() => setAppMode('DATING_FOLDER')}>
                                <span className="phn-ico grid grid-cols-2 gap-0.5 bg-white/15 p-1.5">
                                    <div className="w-full h-full bg-gradient-to-tr from-pink-500 to-orange-500 rounded-[5px] flex items-center justify-center shadow-sm">
                                        <Flame size={12} fill="white" className="text-white" />
                                    </div>
                                    <div className="w-full h-full bg-black border border-amber-500/50 rounded-[5px] flex items-center justify-center relative overflow-hidden shadow-sm">
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent"></div>
                                        <Gem size={10} className="text-amber-500" />
                                    </div>
                                    <span className="h-full w-full" />
                                    <span className="h-full w-full" />
                                </span>
                                <span>{tr('mobile.dating')}</span>
                            </button>

                            {/* GUIDE APP (Updated Icon) */}
                            <AppIcon 
                                icon={<Map size={26} />} 
                                color="bg-zinc-800" 
                                label={tr('mobile.guide')} 
                                onClick={() => setAppMode('GUIDE')} 
                            />

                        </div>
                        <div className="phn-dock">
                            <AppIcon icon={<MessageSquare size={22} fill="white" />} color="bg-green-500" label={tr('mobile.messages')} onClick={() => setAppMode('MESSAGES')} badge={unreadMessages} />
                            <AppIcon icon={<Search size={22} />} color="bg-indigo-600" label="CastLink" onClick={() => setAppMode('CASTLINK')} />
                            <AppIcon icon={<Landmark size={22} />} color="bg-[#004b87]" label={tr('mobile.bank')} onClick={() => setAppMode('BANK')} />
                            <AppIcon icon={<Activity size={22} />} color="bg-zinc-800" label={tr('mobile.stocks')} onClick={() => setAppMode('STOCKS')} />
                        </div>
                    </div>
                )}

                {/* APPS */}
                {appMode === 'INSTAGRAM' && (
                    <InstagramApp 
                        player={props.player} 
                        onBack={() => setAppMode('SOCIAL_FOLDER')} 
                        onPost={props.onPost!} 
                        onReactPost={props.onReactInstagramPost!}
                        onRespondDM={props.onRespondInstagramDM!}
                        onFollow={props.onFollowNPC!} 
                        onInteract={props.onInteractNPC!}
                        onUpdatePlayer={handleUpdatePlayer}
                    />
                )}
                {appMode === 'X' && (
                    <XApp 
                        player={props.player} 
                        onBack={() => setAppMode('SOCIAL_FOLDER')}
                        onUpdatePlayer={handleUpdatePlayer} 
                    />
                )}
                {appMode === 'YOUTUBE' && (
                    <YoutubeApp 
                        player={props.player} 
                        onBack={() => setAppMode('SOCIAL_FOLDER')}
                        onUpdatePlayer={handleUpdatePlayer} 
                    />
                )}
                {appMode === 'BOXOFFICE' && (
                    <BoxOfficeHub player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'STREAMING' && (
                    <StreamingPage player={props.player} onBack={() => setAppMode('HOME')} onOpenRights={() => { armPlatformIdent(props.player); setPlatformPane('rights'); setAppMode('OWN_PLATFORM'); }} />
                )}
                {appMode === 'OWN_PLATFORM' && (
                    <OwnPlatformApp
                        player={props.player}
                        initialPane={platformPane}
                        onBack={() => setAppMode('HOME')}
                        onUpdatePlayer={handleUpdatePlayer}
                    />
                )}
                {appMode === 'CASTLINK' && (
                    <CastLinkApp 
                        player={props.player} 
                        onBack={() => setAppMode('HOME')} 
                        onAudition={props.onAudition!} 
                        onTakeJob={props.onTakeJob!} 
                        onQuitJob={props.onQuitJob!} 
                    />
                )}
                {appMode === 'MESSAGES' && (
                    <MessagesApp 
                        player={props.player} 
                        onBack={() => setAppMode('HOME')} 
                        onAccept={handleAcceptMessage}
                        onDelete={props.onDeleteMessage!} 
                        onMarkRead={handleMarkMessageRead}
                        onUpdatePlayer={handleUpdatePlayer}
                    />
                )}
                {appMode === 'TEAM' && (
                    <TeamApp 
                        player={props.player} 
                        onBack={() => setAppMode('HOME')} 
                        onHireAgent={handleHireAgent} 
                        onFireAgent={props.onFireAgent!} 
                        onHireManager={handleHireManager} 
                        onFireManager={props.onFireManager!} 
                        onPerformSponsorship={handlePerformSponsorship} // New Handler
                        onUpdatePlayer={handleUpdatePlayer}
                        onShowToast={showToast}
                    />
                )}
                {appMode === 'NEWS' && (
                    <NewsApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'IMDB' && (
                    <ImdbApp player={props.player} onBack={() => setAppMode('HOME')} onUpdatePlayer={handleUpdatePlayer} />
                )}
                {appMode === 'FORBES' && (
                    <ForbesApp player={props.player} onBack={() => setAppMode('HOME')} onUpdatePlayer={handleUpdatePlayer} />
                )}
                {appMode === 'STOCKS' && (
                    <StocksApp player={props.player} onBack={() => setAppMode('HOME')} onTrade={props.onTradeStock!} onFoundCompany={props.onFoundCompany} onOpenCompany={() => { armPlatformIdent(props.player); setPlatformPane('launch'); setAppMode('OWN_PLATFORM'); }} onAcquirePlatform={props.onAcquirePlatform} />
                )}
                {appMode === 'BANK' && (
                    <BankApp player={props.player} onBack={() => setAppMode('HOME')} onUpdatePlayer={handleUpdatePlayer} />
                )}
                
                {/* DATING GROUP */}
                {appMode === 'DATING_FOLDER' && (
                    <DatingFolder 
                        onBack={() => setAppMode('HOME')}
                        onOpenTinder={() => setAppMode('TINDER')}
                        onOpenLuxe={() => setAppMode('LUXE')}
                    />
                )}
                {appMode === 'TINDER' && (
                    <TinderApp 
                        player={props.player} 
                        onBack={() => setAppMode('DATING_FOLDER')} 
                        onUpdatePlayer={handleUpdatePlayer}
                        onDateSuccess={handleTinderDateSuccess}
                        onTriggerBabyNaming={props.onTriggerBabyNaming}
                    />
                )}
                {appMode === 'LUXE' && (
                    <LuxeApp player={props.player} onBack={() => setAppMode('DATING_FOLDER')} onUpdatePlayer={handleUpdatePlayer}/>
                )}

                {/* SOCIAL GROUP */}
                {appMode === 'SOCIAL_FOLDER' && (
                    <SocialFolder 
                        onBack={() => setAppMode('HOME')}
                        onOpenX={() => setAppMode('X')}
                        onOpenInsta={() => setAppMode('INSTAGRAM')}
                        onOpenYoutube={() => setAppMode('YOUTUBE')}
                    />
                )}

                {/* GUIDE APP */}
                {appMode === 'GUIDE' && (
                    <GuideView onBack={() => setAppMode('HOME')} />
                )}

                {appMode !== 'HOME' && (
                <div className="pointer-events-none absolute bottom-1 left-0 right-0 z-50 flex justify-center pb-2 lg:hidden">
                     <div className="h-1 w-32 rounded-full bg-white/20"></div>
                </div>
                )}
            </div>
        </div>
        {unreadNotes.length > 0 && (
            <aside className="phn-notes">
                <h3>Unread</h3>
                {unreadNotes.map(note => (
                    <button key={note.id} type="button" className="phn-note" onClick={() => setAppMode('MESSAGES')}>
                        <b>{note.sender}</b>
                        <span>{note.subject}</span>
                    </button>
                ))}
            </aside>
        )}
    </div>
  );
};
