
import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_PLAYER, Player, Page, Commitment, PressInteraction, SocialEvent, ActorSkills, AdType, Relationship, ProjectDetails, ActiveRelease, PastProject, StreamingState, PregnancyCarrier, FilmIndustryId } from './types';
import { BottomNav, SideNav } from './components/BottomNav';
import { IndustryGlobeMark } from './components/IndustryGlobeMark';
import { GameNavProvider, LifestyleDestination } from './components/GameNav';
import { MobilePage, PhoneLaunch } from './views/mobile/MobilePage';
import { ProductionCrisisModal } from './components/ProductionCrisisModal';
import { LifeEventModal } from './components/LifeEventModal';
import { applyCrisisImpact } from './services/productionService';
import { HomePage } from './views/HomePage';
import { CareerPage } from './views/CareerPage';
import { ImprovePage } from './views/ImprovePage';
import { SocialPage } from './views/SocialPage';
import { LifestylePage } from './views/LifestylePage';
import { armPlatformIdent } from './services/ownPlatform/identAudio';
import { SettingsPage } from './views/SettingsPage';
import { StorePage } from './views/StorePage';
import { StartMenu } from './views/StartMenu';
import { CreationMenu } from './views/CreationMenu';
import { DeathScreen } from './views/DeathScreen';
import { RedCarpetEvent } from './views/RedCarpetEvent';
import { PressConferenceEvent } from './views/PressConferenceEvent';
import { processGameWeek, promotePendingEvent } from './services/gameLoop';
import { migrateBoxOfficeHistory } from './services/boxOfficeSim';
import { seedCommissionPlaytest } from './services/commissions/logic';
import { generateAuditions, generatePartTimeJobs, rewardGenreExperience } from './services/roleLogic';
import { generateWeeklyFeed, calculateInteraction, getGenderedAvatar, applyNpcEconomy } from './services/npcLogic';
import { getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists, getRandomWellness, sanitizeTeamPools } from './services/teamLogic';
import { createBusiness, normalizeStudioState } from './services/businessLogic';
import { CheckCircle, Heart, ShieldAlert, AlertTriangle, PlayCircle, Loader2, Skull, Briefcase, Baby } from 'lucide-react'; 
import { useGameActions } from './hooks/useGameActions';
import { PROPERTY_CATALOG, CAR_CATALOG, CLOTHING_CATALOG } from './services/lifestyleLogic';
import { showAd, initAds } from './services/adLogic';
import { ensureTrackingPermission } from './services/trackingService';
import { saveGameData, loadGameData, deleteGameData } from './services/storage';
import { legacySlotSaveKey, LEGACY_SINGLE_SAVE_KEY, LEGACY_WHATS_NEW_KEY, SINGLE_SAVE_KEY, slotMetaKey, slotSaveKey, WHATS_NEW_KEY } from './services/saveKeys';
import { createBloodlineSnapshot, getAbsoluteWeek, getLegacyInheritancePreview, getRelationshipAge, inferStreamingStartWeekAbsolute, inheritActorSkills, LEGACY_MIN_PLAYABLE_AGE } from './services/legacyLogic';
import { applyPremiumPurchase, getRequiredPremiumProductForAsset, hasNoAds, PremiumProductId, restoreWeeklyEnergy, spendPlayerEnergy, syncEnergyDisplay, syncWeeklyEnergyForCommitments } from './services/premiumLogic';
import { purchasePremiumProduct, restorePremiumPurchases } from './services/iapService';
import { confirmSkillPointCredit, requestSkillPointPurchase, restoreSkillPointPurchases, saveCharacterProfile, spendPremiumOnServer } from './services/skillPointClient';
import { SkillPointProductId, costForNextLevel, levelOf } from './services/skillPointLedger';
import { applyAppearance, applyCharacterDraft, buildCustomTalent, ensureSkillState, raisePlayerSkill, raiseWithConfirmedPremium, rememberPremiumSnapshot } from './services/playerTalent';
import { CharacterDraft, CustomTalentDraft } from './services/playerTalent';
import { CartoonFace } from './types';
import { sanitizeAwardRecords } from './services/awardLogic';
import { RoleType } from './types';
import { applyParenthoodAbandonment, getPregnancyFeedbackCopy } from './services/familyLogic';
import { APP_DISPLAY_VERSION } from './services/appVersion';
import { WhatsNewNotes } from './components/WhatsNewNotes';
import { applyLegacyFilmScores, hydrateReleaseWorld } from './services/releaseGauntlet';
import { migrateGlobalExpansion } from './services/migrateIndustries';
import { INDUSTRY_ENGINE } from './services/industryEngine';
import { FestivalNightModal } from './views/FestivalNightModal';
import { calculateInstagramPostOutcome, clampInstagramStat, INSTAGRAM_POST_CONFIGS } from './services/instagramLogic';
import { normalizeUniverseMap } from './services/universeLogic';
import { hydrateGenreXP } from './services/genreCatalog';
import { ensureOwnPlatform, foundEmpire, migrateOwnPlatformOnLoad, platformAlreadyUnlocked } from './services/ownPlatform/migrate';
import { normalizeMarketing } from './services/marketing/core';
import { MarketingPreview } from './views/marketing/MarketingPreview';
import { ScriptDeskPreview } from './views/lifestyle/business/scriptDesk/ScriptDeskPreview';
import { formatCompact, syncRegions } from './services/ownPlatform/logic';
import { FOUNDING_CAPITAL_USD, purchasePlatform } from './services/ownPlatform/studio';
import { BuyFinancing } from './services/ownPlatform/valuation';
import {
  addBreadcrumb,
  markGameCheckpoint,
  markTraceAction,
  recordFlowFailure,
  recordNonFatal,
  setCrashContext,
  setCurrentGameScreen,
  startPerformanceTrace,
  stopPerformanceTrace,
  trackGameEvent,
} from './services/firebaseService';
import { ensureDealState, processDealsWeekly } from './services/deallogic';
import { initializeStocks, normalizeListedStocks } from './services/stockLogic';
import { appendBuzz, appendLedger, appendNews } from './services/playerSignals';
import { formatMoney } from './services/formatUtils';
type GameStatus = 'START_MENU' | 'CREATION' | 'PLAYING' | 'DEATH_SCREEN';
type PendingBabyNaming = {
  partnerId: string;
  partnerName: string;
  pregnancyCarrier?: PregnancyCarrier;
  babyGender: 'MALE' | 'FEMALE';
  suggestedFirstName: string;
  birthWeekAbsolute: number;
  eventWeek: number;
  eventYear: number;
  shouldCreateScandalNews: boolean;
};

const PREGNANCY_TERM_WEEKS = 39;
const WHATS_NEW_STORAGE_KEY = WHATS_NEW_KEY;
const AUTOSAVE_DEBOUNCE_MS = 750;
const RECENT_TIMELINE_WEEKS = 104;
const RECENT_TIMELINE_MAX_ITEMS = 180;
const LEGACY_HIGHLIGHT_MAX_ITEMS = 80;
const FULL_LOCAL_MIRROR_BUDGET_BYTES = 3_500_000;

type CompactTimelineEntry = {
  id: string;
  week: number;
  year: number;
  absoluteWeek: number;
  title: string;
  kind: 'LOG' | 'NEWS' | 'MESSAGE';
  tone: 'positive' | 'negative' | 'neutral';
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
};

const getApproxAbsoluteWeek = (year: number, week: number) => {
  const safeYear = Number.isFinite(year) ? year : 18;
  const safeWeek = Math.min(52, Math.max(1, Number.isFinite(week) ? week : 1));
  return getAbsoluteWeek(safeYear, safeWeek);
};

const makeTimelineEntry = (
  sourceId: string,
  year: number,
  week: number,
  title: string,
  kind: CompactTimelineEntry['kind'],
  tone: CompactTimelineEntry['tone'] | string,
  impact?: CompactTimelineEntry['impact'] | string
): CompactTimelineEntry => ({
  id: `${kind}_${sourceId}_${year}_${week}`,
  year,
  week,
  absoluteWeek: getApproxAbsoluteWeek(year, week),
  title: title.replace(/\s+/g, ' ').trim().slice(0, 180),
  kind,
  tone: tone === 'negative' || tone === 'positive' ? tone : 'neutral',
  impact: impact === 'HIGH' || impact === 'MEDIUM' || impact === 'LOW' ? impact : undefined,
});

const isLegacyWorthyText = (text: string) => {
  const normalized = text.toLowerCase();
  return [
    'award', 'won', 'nominated', 'billion', 'festival', 'married', 'divorce',
    'child', 'baby', 'scandal', 'lawsuit', 'death', 'passed away', 'founded',
    'studio', 'franchise', 'universe', 'forbes', 'record', 'hit', 'flop'
  ].some(keyword => normalized.includes(keyword));
};

const dedupeAwards = <T extends { type: string; year: number; category: string; projectId: string; outcome: 'WON' | 'NOMINATED' }>(awards: T[] = []): T[] => {
  return sanitizeAwardRecords(awards);
};

const normalizeProjectDetails = (details: Partial<ProjectDetails> | undefined): ProjectDetails => {
    const hiddenStats = {
        scriptQuality: 50,
        directorQuality: 50,
        castingStrength: 50,
        distributionPower: 50,
        rawHype: 50,
        qualityScore: 50,
        prestigeBonus: 0,
        ...(details?.hiddenStats || {}),
    };

    return Object.assign({}, details, {
        title: details?.title || 'Untitled Project',
        type: details?.type || 'MOVIE',
        description: details?.description || 'No description available.',
        studioId: details?.studioId || 'INDEPENDENT',
        subtype: details?.subtype || 'STANDALONE',
        genre: details?.genre || 'ACTION',
        budgetTier: details?.budgetTier || 'LOW',
        estimatedBudget: typeof details?.estimatedBudget === 'number' ? details.estimatedBudget : 0,
        visibleHype: details?.visibleHype || 'LOW',
        directorName: details?.directorName || 'Unknown Director',
        visibleDirectorTier: details?.visibleDirectorTier || 'Professional',
        visibleScriptBuzz: details?.visibleScriptBuzz || 'Developing',
        visibleCastStrength: details?.visibleCastStrength || 'TBD',
        castList: Array.isArray(details?.castList) ? details!.castList : [],
        crewList: Array.isArray(details?.crewList) ? details!.crewList : [],
        reviews: Array.isArray(details?.reviews) ? details!.reviews : [],
        campaignItems: Array.isArray(details?.campaignItems) ? details!.campaignItems : [],
        hiddenStats,
    });
};

const normalizeStreamingState = (
    streaming: Partial<StreamingState> | undefined,
    details: ProjectDetails,
    playerAge: number,
    currentWeek: number
): StreamingState => {
    const normalizedStreaming: StreamingState = {
        platformId: streaming?.platformId || (details.hiddenStats.platformId as any) || 'NETFLIX',
        weekOnPlatform: typeof streaming?.weekOnPlatform === 'number' ? streaming.weekOnPlatform : 1,
        totalViews: typeof streaming?.totalViews === 'number' ? streaming.totalViews : 0,
        weeklyViews: Array.isArray(streaming?.weeklyViews) ? streaming!.weeklyViews : [],
        isLeaving: !!streaming?.isLeaving,
        ...(typeof streaming?.startWeek === 'number' ? { startWeek: streaming.startWeek } : {}),
    };

    const inferredStartWeekAbsolute = inferStreamingStartWeekAbsolute(streaming, playerAge, currentWeek);
    if (typeof inferredStartWeekAbsolute === 'number') {
        normalizedStreaming.startWeekAbsolute = inferredStartWeekAbsolute;
    }

    return normalizedStreaming;
};

const derivePlayerRoleType = (
    roleType: string | undefined,
    details?: Partial<ProjectDetails>,
    castList?: any[]
): RoleType => {
    const playerCastEntry = (castList || details?.castList || []).find((member: any) => member?.actorId === 'PLAYER_SELF');
    if (playerCastEntry?.roleType) return playerCastEntry.roleType as RoleType;
    return (roleType as RoleType) || 'LEAD';
};

const normalizeActiveRelease = (release: Partial<ActiveRelease>, playerAge: number, currentWeek: number): ActiveRelease => {
    const projectDetails = normalizeProjectDetails(release.projectDetails);
    const distributionPhase = release.distributionPhase || 'THEATRICAL';

    return applyLegacyFilmScores({
        id: release.id || `release_${Date.now()}`,
        name: release.name || projectDetails.title,
        type: release.type || projectDetails.type,
        roleType: derivePlayerRoleType(release.roleType, projectDetails),
        projectDetails,
        distributionPhase,
        weekNum: typeof release.weekNum === 'number' ? release.weekNum : 1,
        weeklyGross: Array.isArray(release.weeklyGross) ? release.weeklyGross : [],
        totalGross: typeof release.totalGross === 'number' ? release.totalGross : 0,
        budget: typeof release.budget === 'number' ? release.budget : (projectDetails.estimatedBudget || 0),
        status: release.status || 'RUNNING',
        productionPerformance: typeof release.productionPerformance === 'number' ? release.productionPerformance : 50,
        streamingRevenue: typeof release.streamingRevenue === 'number' ? release.streamingRevenue : 0,
        bids: Array.isArray(release.bids) ? release.bids : [],
        ...(release.imdbRating !== undefined ? { imdbRating: release.imdbRating } : {}),
        ...(release.maxTheatricalWeeks !== undefined ? { maxTheatricalWeeks: release.maxTheatricalWeeks } : {}),
        ...(release.weeksInTheaters !== undefined ? { weeksInTheaters: release.weeksInTheaters } : {}),
        ...(release.studioRoyaltyPercentage !== undefined ? { studioRoyaltyPercentage: release.studioRoyaltyPercentage } : {}),
        ...(release.sequelDecisionWeek !== undefined ? { sequelDecisionWeek: release.sequelDecisionWeek } : {}),
        ...(release.sequelDecisionMade !== undefined ? { sequelDecisionMade: release.sequelDecisionMade } : {}),
        ...(release.futurePotential !== undefined ? { futurePotential: release.futurePotential } : {}),
        ...(release.promotionalBuzz !== undefined ? { promotionalBuzz: release.promotionalBuzz } : {}),
        ...(release.royaltyPercentage !== undefined ? { royaltyPercentage: release.royaltyPercentage } : {}),
        ...(release.previousBestBidValue !== undefined ? { previousBestBidValue: release.previousBestBidValue } : {}),
        ...(release.openingGross !== undefined ? { openingGross: release.openingGross } : {}),
        ...(release.releaseWeek !== undefined ? { releaseWeek: release.releaseWeek } : {}),
        ...(release.releaseCalendarYear !== undefined ? { releaseCalendarYear: release.releaseCalendarYear } : {}),
        ...(release.grossIsEstimate !== undefined ? { grossIsEstimate: release.grossIsEstimate } : {}),
        ...(release.clashFactor !== undefined ? { clashFactor: release.clashFactor } : {}),
        ...(release.franchiseId !== undefined ? { franchiseId: release.franchiseId } : {}),
        ...(release.sourceMaterial !== undefined ? { sourceMaterial: release.sourceMaterial } : {}),
        ...(release.installmentNumber !== undefined ? { installmentNumber: release.installmentNumber } : {}),
        ...(typeof release.criticScore === 'number' ? { criticScore: release.criticScore } : {}),
        ...(typeof release.audienceScore === 'number' ? { audienceScore: release.audienceScore } : {}),
        ...(release.reviewBomb ? { reviewBomb: release.reviewBomb } : {}),
        ...(distributionPhase === 'STREAMING' ? { streaming: normalizeStreamingState(release.streaming, projectDetails, playerAge, currentWeek) } : {}),
    });
};

const normalizePastProject = (project: Partial<PastProject>): PastProject => applyLegacyFilmScores({
    id: project.id || `past_${Date.now()}`,
    name: project.name || 'Untitled Project',
    type: 'ACTING_GIG',
    roleType: derivePlayerRoleType(project.roleType, undefined, project.castList as any[] | undefined),
    year: typeof project.year === 'number' ? project.year : 1,
    earnings: typeof project.earnings === 'number' ? project.earnings : 0,
    rating: typeof project.rating === 'number' ? project.rating : 0,
    reception: project.reception || 'UNKNOWN',
    projectQuality: typeof project.projectQuality === 'number' ? project.projectQuality : 50,
    boxOfficeResult: project.boxOfficeResult || '$0',
    outcomeTier: project.outcomeTier || 'NEUTRAL',
    subtype: project.subtype || 'STANDALONE',
    futurePotential: project.futurePotential || {
        sequelChance: 0,
        franchiseChance: 0,
        rebootChance: 0,
        renewalChance: 0,
        isFranchiseStarter: false,
        isSequelGreenlit: false,
        isRenewed: false,
        seriesStatus: 'N/A',
        playerReturnStatus: undefined,
        returnStatusNote: undefined,
    },
    studioId: project.studioId || 'INDEPENDENT',
    budget: typeof project.budget === 'number' ? project.budget : 0,
    gross: typeof project.gross === 'number' ? project.gross : 0,
    genre: project.genre || (project as any).projectDetails?.genre || 'ACTION',
    projectType: project.projectType || 'MOVIE',
    awards: dedupeAwards(project.awards || []),
    castList: Array.isArray(project.castList) ? project.castList : [],
    reviews: Array.isArray(project.reviews) ? project.reviews : [],
    ...project,
});

const normalizeCommitment = (commitment: Partial<Commitment>): Commitment => ({
    id: commitment.id || `commitment_${Date.now()}`,
    name: commitment.name || 'Untitled Commitment',
    type: commitment.type || 'JOB',
    energyCost: typeof commitment.energyCost === 'number' ? commitment.energyCost : 0,
    income: typeof commitment.income === 'number' ? commitment.income : 0,
    payoutType: commitment.payoutType || 'WEEKLY',
    ...(commitment.lumpSum !== undefined ? { lumpSum: commitment.lumpSum } : {}),
    ...(commitment.weeklyCost !== undefined ? { weeklyCost: commitment.weeklyCost } : {}),
    ...(commitment.upfrontCost !== undefined ? { upfrontCost: commitment.upfrontCost } : {}),
    ...(commitment.roleType !== undefined ? { roleType: commitment.roleType } : {}),
    ...(commitment.projectPhase !== undefined ? { projectPhase: commitment.projectPhase } : {}),
    ...(commitment.phaseWeeksLeft !== undefined ? { phaseWeeksLeft: commitment.phaseWeeksLeft } : {}),
    ...(commitment.totalPhaseDuration !== undefined ? { totalPhaseDuration: commitment.totalPhaseDuration } : {}),
    ...(commitment.auditionPerformance !== undefined ? { auditionPerformance: commitment.auditionPerformance } : {}),
    ...(commitment.productionPerformance !== undefined ? { productionPerformance: commitment.productionPerformance } : {}),
    ...(commitment.promotionalBuzz !== undefined ? { promotionalBuzz: commitment.promotionalBuzz } : {}),
    ...(commitment.lastPressWeek !== undefined ? { lastPressWeek: commitment.lastPressWeek } : {}),
    ...(commitment.lastPressAbsolute !== undefined ? { lastPressAbsolute: commitment.lastPressAbsolute } : {}),
    ...(commitment.weeksCompleted !== undefined ? { weeksCompleted: commitment.weeksCompleted } : {}),
    ...(commitment.totalDuration !== undefined ? { totalDuration: commitment.totalDuration } : {}),
    ...(commitment.skillGains !== undefined ? { skillGains: commitment.skillGains } : {}),
    ...(commitment.statGains !== undefined ? { statGains: commitment.statGains } : {}),
    ...(commitment.writerGains !== undefined ? { writerGains: commitment.writerGains } : {}),
    ...(commitment.directorGains !== undefined ? { directorGains: commitment.directorGains } : {}),
    ...(commitment.agentCommission !== undefined ? { agentCommission: commitment.agentCommission } : {}),
    ...(commitment.royaltyPercentage !== undefined ? { royaltyPercentage: commitment.royaltyPercentage } : {}),
    ...(commitment.durationLeft !== undefined ? { durationLeft: commitment.durationLeft } : {}),
    ...(commitment.previousBestBidValue !== undefined ? { previousBestBidValue: commitment.previousBestBidValue } : {}),
    ...(commitment.projectDetails ? { projectDetails: normalizeProjectDetails(commitment.projectDetails) } : {}),
});

type GameErrorBoundaryProps = { onRecover: () => void; children: React.ReactNode };
type GameErrorBoundaryState = { hasError: boolean };

class GameErrorBoundary extends React.Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
    state: GameErrorBoundaryState = { hasError: false };

    constructor(props: GameErrorBoundaryProps) {
        super(props);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('Game render crash recovered by boundary:', error);
        recordNonFatal(error, 'react_render_boundary_recovered');
    }

    handleRecover = () => {
        this.props.onRecover();
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="text-xl font-black uppercase tracking-widest mb-3">Recovery Mode</div>
                    <p className="text-sm text-zinc-400 max-w-xs mb-6">
                        A save or screen error was detected. You can return to the menu instead of getting stuck on a black screen.
                    </p>
                    <button
                        onClick={this.handleRecover}
                        className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200"
                    >
                        Return To Menu
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export const App: React.FC = () => {
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [phoneLaunch, setPhoneLaunch] = useState<PhoneLaunch | null>(null);
  const [lifestyleInitialView, setLifestyleInitialView] = useState<'MAIN' | 'ASSETS' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('START_MENU');
  const [saveSlots, setSaveSlots] = useState<Record<number, Player | null>>({ 1: null, 2: null, 3: null });
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Loading state for async storage
  
  // UI States
  const [toastMessage, setToastMessage] = useState<{title: string, subtext: string} | null>(null);
  const [activePressEvent, setActivePressEvent] = useState<{ project: Commitment, questions: PressInteraction[] } | null>(null);
  const [showProtectionPrompt, setShowProtectionPrompt] = useState<{ partnerId: string, partnerName: string } | null>(null);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [activeSocialEvent, setActiveSocialEvent] = useState<{ event: SocialEvent, partnerId: string } | null>(null);
  const [pendingBabyNaming, setPendingBabyNaming] = useState<PendingBabyNaming | null>(null);
  const [babyFirstNameInput, setBabyFirstNameInput] = useState('');
  const [babySurnameChoice, setBabySurnameChoice] = useState('');
  const [deathScreenPreviewPlayer, setDeathScreenPreviewPlayer] = useState<Player | null>(null);
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [showPreviousWhatsNewNotes, setShowPreviousWhatsNewNotes] = useState(false);
  
  // DEBT / AD STATES
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adStep, setAdStep] = useState(0); 
  const [adTotalSteps, setAdTotalSteps] = useState(1);
  const autosaveTimerRef = useRef<number | null>(null);

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  const preparePlayerForPersistence = (nextPlayer: Player): Player => {
      const currentAbsoluteWeek = getApproxAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
      const recentCutoff = currentAbsoluteWeek - RECENT_TIMELINE_WEEKS;
      const existingTimeline = Array.isArray(nextPlayer.flags?.recentTimeline)
          ? nextPlayer.flags.recentTimeline
          : [];
      const existingHighlights = Array.isArray(nextPlayer.flags?.legacyHighlights)
          ? nextPlayer.flags.legacyHighlights
          : [];
      const logTimeline = Array.isArray(nextPlayer.logs)
          ? nextPlayer.logs.map((log, index) => makeTimelineEntry(
              `log_${index}_${log.message}`,
              log.year,
              log.week,
              log.message,
              'LOG',
              log.type
          ))
          : [];
      const newsTimeline = Array.isArray(nextPlayer.news)
          ? nextPlayer.news.map((item: any, index: number) => makeTimelineEntry(
              item.id || `news_${index}`,
              item.year || nextPlayer.age,
              item.week || nextPlayer.currentWeek,
              item.headline || item.subtext || 'Industry news',
              'NEWS',
              item.impactLevel === 'HIGH' ? 'positive' : 'neutral',
              item.impactLevel
          ))
          : [];
      const timelineById = new Map<string, CompactTimelineEntry>();
      [...existingTimeline, ...logTimeline, ...newsTimeline]
          .filter((entry: CompactTimelineEntry) => entry?.title && entry.absoluteWeek >= recentCutoff)
          .forEach((entry: CompactTimelineEntry) => timelineById.set(entry.id, entry));
      const recentTimeline = Array.from(timelineById.values())
          .sort((a, b) => b.absoluteWeek - a.absoluteWeek)
          .slice(0, RECENT_TIMELINE_MAX_ITEMS);
      const highlightById = new Map<string, CompactTimelineEntry>();
      [...existingHighlights, ...recentTimeline.filter(entry => entry.impact === 'HIGH' || isLegacyWorthyText(entry.title))]
          .filter((entry: CompactTimelineEntry) => entry?.title)
          .forEach((entry: CompactTimelineEntry) => highlightById.set(entry.id, entry));
      const legacyHighlights = Array.from(highlightById.values())
          .sort((a, b) => b.absoluteWeek - a.absoluteWeek)
          .slice(0, LEGACY_HIGHLIGHT_MAX_ITEMS);
      const safePlayer: any = {
          ...nextPlayer,
          logs: Array.isArray(nextPlayer.logs) ? nextPlayer.logs.slice(-50) : [],
          news: Array.isArray(nextPlayer.news) ? nextPlayer.news.slice(0, 80) : [],
          inbox: Array.isArray(nextPlayer.inbox) ? nextPlayer.inbox.slice(0, 120) : [],
          flags: {
              ...(nextPlayer.flags || {}),
              recentTimeline,
              legacyHighlights,
              persistenceOptimizedAtWeek: currentAbsoluteWeek,
          },
      };

      if (safePlayer.instagram) {
          safePlayer.instagram = {
              ...safePlayer.instagram,
              posts: Array.isArray(safePlayer.instagram.posts) ? safePlayer.instagram.posts.slice(0, 200) : [],
              feed: Array.isArray(safePlayer.instagram.feed) ? safePlayer.instagram.feed.slice(0, 80) : [],
          };
      }

      if (safePlayer.x) {
          safePlayer.x = {
              ...safePlayer.x,
              posts: Array.isArray(safePlayer.x.posts) ? safePlayer.x.posts.slice(0, 200) : [],
              feed: Array.isArray(safePlayer.x.feed) ? safePlayer.x.feed.slice(0, 80) : [],
          };
      }

      if (safePlayer.youtube) {
          safePlayer.youtube = {
              ...safePlayer.youtube,
              videos: Array.isArray(safePlayer.youtube.videos)
                  ? safePlayer.youtube.videos.slice(0, 120).map((video: any) => ({
                      ...video,
                      comments: Array.isArray(video.comments) ? video.comments.slice(0, 12) : [],
                      weeklyHistory: Array.isArray(video.weeklyHistory) ? video.weeklyHistory.slice(-24) : [],
                  }))
                  : [],
          };
      }
      ensureDealState(safePlayer);
 
      return safePlayer as Player;
  };
  const writeLocalStorageMirror = (slot: number, playerToSave: Player) => {
      try {
          const serialized = JSON.stringify(playerToSave);
          if (serialized.length <= FULL_LOCAL_MIRROR_BUDGET_BYTES) {
              localStorage.setItem(slotSaveKey(slot), serialized);
              if (slot === 1) {
                  localStorage.setItem(SINGLE_SAVE_KEY, serialized);
              }
          } else {
              localStorage.setItem(slotMetaKey(slot), JSON.stringify({
                  version: APP_DISPLAY_VERSION,
                  slot,
                  playerName: playerToSave.name,
                  age: playerToSave.age,
                  week: playerToSave.currentWeek,
                  savedAt: Date.now(),
                  storage: 'indexeddb',
                  note: 'Full save stored in IndexedDB. Local mirror skipped to avoid mobile quota pressure.',
              }));
              localStorage.removeItem(slotSaveKey(slot));
              localStorage.removeItem(legacySlotSaveKey(slot));
              if (slot === 1) {
                  localStorage.removeItem(SINGLE_SAVE_KEY);
                  localStorage.removeItem(LEGACY_SINGLE_SAVE_KEY);
              }
          }
      } catch (error) {
          console.error("Local save mirror failed", error);
      }
  };
  const getSurname = (fullName: string) => {
      const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return 'Legacy';
      return parts[parts.length - 1];
  };
  const getGivenName = (fullName: string) => {
      const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
      return parts[0] || fullName || 'Partner';
  };
  const getBabySurnameOptions = (partnerName: string) => {
      const playerSurname = getSurname(player.name);
      const partnerSurname = getSurname(partnerName);
      const options = [
          { id: 'PLAYER', label: `Your surname`, value: playerSurname },
          { id: 'PARTNER', label: `${getGivenName(partnerName)}'s surname`, value: partnerSurname },
          { id: 'BOTH', label: 'Both surnames', value: playerSurname === partnerSurname ? playerSurname : `${playerSurname}-${partnerSurname}` }
      ];

      return options.filter((option, index, arr) => arr.findIndex(other => other.value === option.value) === index);
  };
  const persistSlotSave = (slot: number, nextPlayer: Player) => {
      const playerToSave = preparePlayerForPersistence(nextPlayer);
      saveGameData(slotSaveKey(slot), playerToSave);

      const writeLocalMirror = () => {
          writeLocalStorageMirror(slot, playerToSave);
      };

      const requestIdleCallback = (globalThis as any).requestIdleCallback as ((cb: () => void, options?: { timeout?: number }) => void) | undefined;
      if (requestIdleCallback) {
          requestIdleCallback(writeLocalMirror, { timeout: 1800 });
      } else {
          globalThis.setTimeout(writeLocalMirror, 0);
      }
  };
  const syncCurrentSlotSnapshot = (nextPlayer: Player) => {
      if (!currentSlot) return;
      setSaveSlots(prev => ({ ...prev, [currentSlot]: nextPlayer }));
      persistSlotSave(currentSlot, nextPlayer);
  };

  useEffect(() => {
    if (activePage !== Page.LIFESTYLE) {
      setIsBottomNavVisible(true);
    }
  }, [activePage]);

  useEffect(() => {
    const pageName = Page[activePage] || String(activePage);
    const screenName = `${gameStatus}_${pageName}`;
    setCurrentGameScreen(screenName);
    setCrashContext(player, {
      screen: pageName,
      game_status: gameStatus,
      save_slot: currentSlot,
    });
    markGameCheckpoint('screen_changed', player, {
      screen: pageName,
      game_status: gameStatus,
      save_slot: currentSlot,
    });

    if (gameStatus === 'PLAYING') {
      if (activePage === Page.CAREER) {
        markGameCheckpoint('profile_opened', player, {
          screen: pageName,
          credits: player.filmography?.length || 0,
          awards: player.awards?.length || 0,
          commitments: player.commitments?.length || 0,
        });
      }
      if (activePage === Page.LIFESTYLE) {
        markGameCheckpoint('lifestyle_opened', player, {
          screen: pageName,
          businesses: player.businesses?.length || 0,
          production_house: !!player.productionHouse,
        });
      }
      if (activePage === Page.MOBILE) {
        markGameCheckpoint('mobile_apps_opened', player, {
          screen: pageName,
          messages: player.messages?.length || 0,
          pending_events: player.pendingEvents?.length || 0,
        });
      }
    }
  }, [activePage, gameStatus, currentSlot, player.age, player.currentWeek]);

  // --- LOGIC HOOK ---
  const { 
      handleGenericUpdate, handleRehearse, handleImproveAction, 
      handlePartnerAction, handleSocialInteract, handleIntimacyChoice, 
      handlePromotionAction, handleNPCInteract
  } = useGameActions({ 
      player, setPlayer, setToastMessage, setActivePressEvent, setShowProtectionPrompt, setActiveSocialEvent, setPendingBabyNaming
  });

  useEffect(() => {
    if (!pendingBabyNaming) return;
    setBabyFirstNameInput(pendingBabyNaming.suggestedFirstName);
    const surnameOptions = getBabySurnameOptions(pendingBabyNaming.partnerName);
    setBabySurnameChoice(surnameOptions[0]?.value || getSurname(player.name));
  }, [pendingBabyNaming]);

  useEffect(() => {
    if (isInitializing || gameStatus !== 'PLAYING') return;
    try {
      const seenVersion = localStorage.getItem(WHATS_NEW_STORAGE_KEY) || localStorage.getItem(LEGACY_WHATS_NEW_KEY);
      if (seenVersion !== APP_DISPLAY_VERSION) {
        setShowWhatsNewModal(true);
      }
    } catch (error) {
      console.error('Failed to read What\'s New state', error);
      setShowWhatsNewModal(true);
    }
  }, [gameStatus, isInitializing]);

  const handleDismissWhatsNew = () => {
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_DISPLAY_VERSION);
    } catch (error) {
      console.error('Failed to persist What\'s New state', error);
    }
    setShowPreviousWhatsNewNotes(false);
    setShowWhatsNewModal(false);
  };

  const handleShowWhatsNewCheat = () => {
    try {
      localStorage.removeItem(WHATS_NEW_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset What\'s New state', error);
    }
    setShowPreviousWhatsNewNotes(false);
    setShowWhatsNewModal(true);
  };

  const handleConfirmBabyName = () => {
      if (!pendingBabyNaming) return;
      const trimmedFirstName = babyFirstNameInput.trim();
      if (!trimmedFirstName) return;

      const finalName = `${trimmedFirstName} ${babySurnameChoice}`.trim();
      const babyBirthAbsolute = pendingBabyNaming.birthWeekAbsolute;
      const partnerName = pendingBabyNaming.partnerName;
      const babyGender = pendingBabyNaming.babyGender;
      const shouldCreateScandalNews = pendingBabyNaming.shouldCreateScandalNews;
      const eventWeek = pendingBabyNaming.eventWeek;
      const eventYear = pendingBabyNaming.eventYear;

      setPlayer(prev => {
          const newRelationships = [...prev.relationships, {
              id: `child_${Date.now()}`,
              name: finalName,
              relation: 'Child',
              closeness: 100,
              image: getGenderedAvatar(babyGender, trimmedFirstName),
              lastInteractionWeek: eventWeek,
              lastInteractionAbsolute: babyBirthAbsolute,
              age: 0,
              gender: babyGender,
              birthWeekAbsolute: babyBirthAbsolute,
          } satisfies Relationship];

          const newNews = [...prev.news];
          if (shouldCreateScandalNews) {
              newNews.unshift({
                  id: `news_scandal_baby_${Date.now()}`,
                  headline: `SCANDAL: ${prev.name} Welcomes Secret Love Child!`,
                  subtext: `Fans shocked by sudden baby announcement with partner ${partnerName}.`,
                  category: 'TOP_STORY',
                  week: eventWeek,
                  year: eventYear,
                  impactLevel: 'HIGH'
              });
          }

          return {
              ...prev,
              relationships: newRelationships,
              news: newNews,
              logs: [{ week: eventWeek, year: eventYear, message: `🍼 ${finalName} was welcomed into your family with ${partnerName}.`, type: 'positive' }, ...prev.logs].slice(0, 50)
          };
      });

      setToastMessage({ title: 'Baby Named', subtext: `Welcome, ${finalName}.` });
      setPendingBabyNaming(null);
      setBabyFirstNameInput('');
      setBabySurnameChoice('');
  };

  const handleAbandonBaby = () => {
      if (!pendingBabyNaming) return;

      setPlayer(prev =>
          applyParenthoodAbandonment(prev, {
              partnerId: pendingBabyNaming.partnerId,
              partnerName: pendingBabyNaming.partnerName,
              babyGender: pendingBabyNaming.babyGender,
              childName: `${pendingBabyNaming.suggestedFirstName} ${getSurname(pendingBabyNaming.partnerName)}`.trim(),
              birthWeekAbsolute: pendingBabyNaming.birthWeekAbsolute,
              hideFromConnections: true,
          })
      );

      setToastMessage({
          title: 'Parenthood Rejected',
          subtext: `You walked away. The fallout will follow you.`,
      });
      setPendingBabyNaming(null);
      setBabyFirstNameInput('');
      setBabySurnameChoice('');
  };

  // Check for saved game on initial mount & Init Ads
  useEffect(() => {
    const init = async () => {
        try {
            await ensureTrackingPermission();
            await initAds();
            
            const slots: Record<number, Player | null> = { 1: null, 2: null, 3: null };
            
            // 1. Check IndexedDB for all 3 slots
            for (let i = 1; i <= 3; i++) {
                const savedData = await loadGameData(slotSaveKey(i)) || await loadGameData(legacySlotSaveKey(i));
                if (savedData) {
                    slots[i] = savedData;
                }
            }
            
            // 2. Migration fallback matrix for older Android builds:
            // old single-key IndexedDB, old per-slot localStorage, then old single-key localStorage.
            const hasAnySave = Object.values(slots).some(s => s !== null);
            if (!hasAnySave) {
                const legacyIndexedDbSave = await loadGameData(SINGLE_SAVE_KEY) || await loadGameData(LEGACY_SINGLE_SAVE_KEY);
                if (legacyIndexedDbSave) {
                    console.log("Migrating legacy IndexedDB save to Slot 1...");
                    persistSlotSave(1, legacyIndexedDbSave);
                    slots[1] = legacyIndexedDbSave;
                } else {
                    for (let i = 1; i <= 3; i++) {
                        const legacySlotSave = localStorage.getItem(slotSaveKey(i)) || localStorage.getItem(legacySlotSaveKey(i));
                        if (!legacySlotSave) continue;
                        try {
                            const savedData = JSON.parse(legacySlotSave);
                            console.log(`Migrating localStorage slot ${i} to IndexedDB...`);
                            persistSlotSave(i, savedData);
                            slots[i] = savedData;
                        } catch (e) {
                            console.error(`Legacy slot ${i} corrupt`, e);
                            recordNonFatal(e, 'legacy_slot_migration_failed', { slot: i });
                        }
                    }

                    const hasRecoveredSlot = Object.values(slots).some(s => s !== null);
                    if (!hasRecoveredSlot) {
                        const legacySave = localStorage.getItem(SINGLE_SAVE_KEY) || localStorage.getItem(LEGACY_SINGLE_SAVE_KEY);
                        if (legacySave) {
                            try {
                                const savedData = JSON.parse(legacySave);
                                console.log("Migrating legacy save to Slot 1...");
                                persistSlotSave(1, savedData);
                                slots[1] = savedData;
                            } catch (e) {
                                console.error("Legacy save corrupt", e);
                                recordNonFatal(e, 'legacy_save_migration_failed');
                            }
                        }
                    }
                }
            }

            setSaveSlots(slots);
        } catch (e) {
            console.error("Init failed", e);
            recordNonFatal(e, 'app_init_failed');
        } finally {
            setIsInitializing(false);
        }
    };
    init();
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
    }

    if (gameStatus !== 'PLAYING' || !currentSlot) return;

    autosaveTimerRef.current = window.setTimeout(() => {
        setSaveSlots(prev => ({ ...prev, [currentSlot]: player }));
        persistSlotSave(currentSlot, player);
        autosaveTimerRef.current = null;
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
    };
  }, [player, gameStatus, currentSlot]);

  useEffect(() => {
      if (gameStatus !== 'PLAYING' || !currentSlot) return;
      const flush = () => persistSlotSave(currentSlot, player);
      window.addEventListener('pagehide', flush);
      return () => window.removeEventListener('pagehide', flush);
  }, [player, gameStatus, currentSlot]);

  const handleSelectSlot = (slot: number) => {
    setCurrentSlot(slot);
    const existingSave = saveSlots[slot];
    if (existingSave) {
        applyNpcEconomy(existingSave.world?.npcEconomy);
        setPlayer(migrateGlobalExpansion(migrateBoxOfficeHistory(clone(existingSave))));
        setGameStatus('PLAYING');
    } else {
        applyNpcEconomy(null);
        setPlayer(INITIAL_PLAYER);
        setGameStatus('CREATION');
    }
  };

  const handleDeleteSlot = async (slot: number) => {
    await deleteGameData(slotSaveKey(slot));
    await deleteGameData(legacySlotSaveKey(slot));
    localStorage.removeItem(slotSaveKey(slot));
    localStorage.removeItem(legacySlotSaveKey(slot));
    if (slot === 1) {
        localStorage.removeItem(SINGLE_SAVE_KEY);
        localStorage.removeItem(LEGACY_SINGLE_SAVE_KEY);
    }
    setSaveSlots(prev => ({ ...prev, [slot]: null }));
  };

  const handleRecoverToMenu = () => {
    setShowDebtModal(false);
    setIsShowingAd(false);
    setActivePressEvent(null);
    setShowProtectionPrompt(null);
    setActiveSocialEvent(null);
    setActivePage(Page.HOME);
    setGameStatus('START_MENU');
  };

  // Init opportunities and feed on mount (Hydration logic)
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      setPlayer(prev => {
          const safePlayer = { ...prev } as any;
          if (!safePlayer.world || typeof safePlayer.world !== 'object') {
              safePlayer.world = clone(INITIAL_PLAYER.world);
          } else {
              safePlayer.world = {
                  ...clone(INITIAL_PLAYER.world),
                  ...safePlayer.world,
                  universes: {
                      ...clone(INITIAL_PLAYER.world.universes),
                      ...(safePlayer.world.universes || {}),
                  },
                  platforms: {
                      ...clone(INITIAL_PLAYER.world.platforms),
                      ...(safePlayer.world.platforms || {}),
                  }
              };
          }
          safePlayer.world.universes = normalizeUniverseMap(safePlayer.world.universes);

          if (!safePlayer.energy || typeof safePlayer.energy !== 'object') {
              const fallbackEnergy = typeof safePlayer.energy === 'number' ? safePlayer.energy : 100;
              safePlayer.energy = {
                  current: Math.max(0, fallbackEnergy),
                  max: Math.max(100, fallbackEnergy)
              };
          } else {
              if (typeof safePlayer.energy.current !== 'number') safePlayer.energy.current = 100;
              if (typeof safePlayer.energy.max !== 'number') safePlayer.energy.max = Math.max(100, safePlayer.energy.current);
          }

          safePlayer.settings = {
              ...clone(INITIAL_PLAYER.settings),
              ...(safePlayer.settings && typeof safePlayer.settings === 'object' ? safePlayer.settings : {})
          };
          safePlayer.settings.language = safePlayer.settings.language === 'pt-BR' ? 'pt-BR' : 'en';
          if (safePlayer.ownPlatform) {
              const migrated = migrateOwnPlatformOnLoad(safePlayer as Player);
              safePlayer.ownPlatform = migrated.ownPlatform;
          }
          safePlayer.marketing = normalizeMarketing(safePlayer.marketing);
          safePlayer.settings.smoothMode = safePlayer.settings.smoothMode === true;

          if (!safePlayer.writerStats) {
              safePlayer.writerStats = { creativity: 0, dialogue: 0, structure: 0, pacing: 0 };
          } else {
              if (safePlayer.writerStats.creativity === undefined) safePlayer.writerStats.creativity = 0;
              if (safePlayer.writerStats.dialogue === undefined) safePlayer.writerStats.dialogue = 0;
              if (safePlayer.writerStats.structure === undefined) safePlayer.writerStats.structure = 0;
              if (safePlayer.writerStats.pacing === undefined) safePlayer.writerStats.pacing = 0;
          }

          if (!safePlayer.directorStats) {
              safePlayer.directorStats = { vision: 0, technical: 0, leadership: 0, style: 0 };
          } else {
              if (safePlayer.directorStats.vision === undefined) safePlayer.directorStats.vision = 0;
              if (safePlayer.directorStats.technical === undefined) safePlayer.directorStats.technical = 0;
              if (safePlayer.directorStats.leadership === undefined) safePlayer.directorStats.leadership = 0;
              if (safePlayer.directorStats.style === undefined) safePlayer.directorStats.style = 0;
          }

          if (!safePlayer.stats) safePlayer.stats = clone(INITIAL_PLAYER.stats);
          safePlayer.stats.genreXP = hydrateGenreXP(safePlayer.stats.genreXP);

          if (!safePlayer.team) safePlayer.team = { ...INITIAL_PLAYER.team };
          if (safePlayer.team.wellness === undefined) safePlayer.team.wellness = null;
          const hiredTeamIds = [
              safePlayer.team.agent?.id,
              safePlayer.team.manager?.id,
              safePlayer.team.personalTrainer?.id,
              safePlayer.team.stylist?.id,
              safePlayer.team.therapist?.id,
              safePlayer.team.publicist?.id,
              safePlayer.team.wellness?.id,
          ].filter((id): id is string => Boolean(id));
          
          // Ensure Pools
          if (!safePlayer.team.availableAgents?.length) safePlayer.team.availableAgents = getRandomAgents(3, hiredTeamIds);
          if (!safePlayer.team.availableManagers?.length) safePlayer.team.availableManagers = getRandomManagers(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableTrainers) || safePlayer.team.availableTrainers.length === 0) safePlayer.team.availableTrainers = getRandomTrainers(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableStylists) || safePlayer.team.availableStylists.length === 0) safePlayer.team.availableStylists = getRandomStylists(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableTherapists) || safePlayer.team.availableTherapists.length === 0) safePlayer.team.availableTherapists = getRandomTherapists(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availablePublicists) || safePlayer.team.availablePublicists.length === 0) safePlayer.team.availablePublicists = getRandomPublicists(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableWellness) || safePlayer.team.availableWellness.length === 0) safePlayer.team.availableWellness = getRandomWellness(2, hiredTeamIds);
          safePlayer.team = sanitizeTeamPools(safePlayer);

          // Ensure Arrays
          if (!Array.isArray(safePlayer.commitments)) safePlayer.commitments = [];
          safePlayer.commitments = safePlayer.commitments.map((commitment: any) => normalizeCommitment(commitment));
          if (!Array.isArray(safePlayer.activeReleases)) safePlayer.activeReleases = [];
          safePlayer.activeReleases = safePlayer.activeReleases.map((release: any) => normalizeActiveRelease(release, safePlayer.age, safePlayer.currentWeek));
          if (!Array.isArray(safePlayer.pastProjects)) safePlayer.pastProjects = [];
          safePlayer.pastProjects = safePlayer.pastProjects.map((project: any) => normalizePastProject(project));
          if (!Array.isArray(safePlayer.news)) safePlayer.news = [];
          if (!Array.isArray(safePlayer.inbox)) safePlayer.inbox = [];
          if (!Array.isArray(safePlayer.activeSponsorships)) safePlayer.activeSponsorships = [];
          if (!Array.isArray(safePlayer.applications)) safePlayer.applications = [];
          if (!safePlayer.studioMemory) safePlayer.studioMemory = {} as any;
          if (!safePlayer.world) safePlayer.world = { ...INITIAL_PLAYER.world };
          Object.assign(safePlayer, migrateGlobalExpansion(safePlayer));
          safePlayer.world = hydrateReleaseWorld(safePlayer).world;
          if (!safePlayer.world.npcVentures || typeof safePlayer.world.npcVentures !== 'object') safePlayer.world.npcVentures = {};
          if (!safePlayer.world.studios || typeof safePlayer.world.studios !== 'object') safePlayer.world.studios = { ...INITIAL_PLAYER.world.studios };
          (['MARVEL_STUDIOS', 'DC_STUDIOS', 'LUCASFILM'] as const).forEach(studioId => {
              const studio = safePlayer.world.studios?.[studioId];
              if (studio && studio.archetype === 'FRANCHISE') studio.archetype = 'UNIVERSE_ARCHITECT';
          });
          applyNpcEconomy(safePlayer.world.npcEconomy);
          if (!Array.isArray(safePlayer.pendingEvents)) safePlayer.pendingEvents = [];
          if (!Array.isArray(safePlayer.pendingEventQueue)) safePlayer.pendingEventQueue = [];
          if (!safePlayer.pendingEvent || typeof safePlayer.pendingEvent !== 'object') safePlayer.pendingEvent = null;
          if (!Array.isArray(safePlayer.logs)) safePlayer.logs = [];
          if (!safePlayer.weeklyOpportunities || !Array.isArray(safePlayer.weeklyOpportunities.auditions) || !Array.isArray(safePlayer.weeklyOpportunities.jobs)) {
              safePlayer.weeklyOpportunities = { auditions: [], jobs: [] };
          }
          
          const fallbackHandle = `@${safePlayer.name.replace(/\s+/g, '_').toLowerCase()}`;

          if (!safePlayer.instagram) safePlayer.instagram = { ...INITIAL_PLAYER.instagram, handle: fallbackHandle };
          if (!Array.isArray(safePlayer.instagram.feed)) safePlayer.instagram.feed = [];
          if (!Array.isArray(safePlayer.instagram.posts)) safePlayer.instagram.posts = [];
          if (!safePlayer.instagram.npcStates) safePlayer.instagram.npcStates = {};
          if (typeof safePlayer.instagram.weeklyPostCount !== 'number') safePlayer.instagram.weeklyPostCount = 0;
          if (typeof safePlayer.instagram.lastPostWeek !== 'number') safePlayer.instagram.lastPostWeek = 0;
          if (typeof safePlayer.instagram.followers !== 'number') safePlayer.instagram.followers = safePlayer.stats.followers || 0;
          if (typeof safePlayer.instagram.aesthetic !== 'number') safePlayer.instagram.aesthetic = 50;
          if (typeof safePlayer.instagram.authenticity !== 'number') safePlayer.instagram.authenticity = 55;
          if (typeof safePlayer.instagram.controversy !== 'number') safePlayer.instagram.controversy = 0;
          if (typeof safePlayer.instagram.fashionInfluence !== 'number') safePlayer.instagram.fashionInfluence = 10;
          if (typeof safePlayer.instagram.fanLoyalty !== 'number') safePlayer.instagram.fanLoyalty = 45;

          if (!safePlayer.x) safePlayer.x = { handle: safePlayer.instagram.handle, followers: 0, posts: [], feed: [], lastPostWeek: 0 };
          // HYDRATION FIX: If loading old save without x.followers, init it based on existing fame
          if (typeof safePlayer.x.followers !== 'number') {
              safePlayer.x.followers = Math.floor(safePlayer.stats.followers * 0.1) || 20;
          }
          if (!Array.isArray(safePlayer.x.posts)) safePlayer.x.posts = [];
          if (!Array.isArray(safePlayer.x.feed)) safePlayer.x.feed = [];
          if (typeof safePlayer.x.lastPostWeek !== 'number') safePlayer.x.lastPostWeek = 0;

          if (!safePlayer.youtube) safePlayer.youtube = { ...INITIAL_PLAYER.youtube, handle: safePlayer.instagram.handle };
          if (!Array.isArray(safePlayer.youtube.videos)) safePlayer.youtube.videos = [];
          if (!Array.isArray(safePlayer.youtube.activeCollabs)) safePlayer.youtube.activeCollabs = [];
          if (!Array.isArray(safePlayer.youtube.activeBrandDeals)) safePlayer.youtube.activeBrandDeals = [];
          if (!safePlayer.youtube.bannerColor) safePlayer.youtube.bannerColor = 'bg-gradient-to-r from-red-900 to-zinc-900';
          if (typeof safePlayer.youtube.subscribers !== 'number') safePlayer.youtube.subscribers = 0;
          if (typeof safePlayer.youtube.lifetimeEarnings !== 'number') safePlayer.youtube.lifetimeEarnings = 0;
          if (typeof safePlayer.youtube.totalChannelViews !== 'number') safePlayer.youtube.totalChannelViews = 0;
          if (typeof safePlayer.youtube.isMonetized !== 'boolean') safePlayer.youtube.isMonetized = false;
          if (typeof safePlayer.youtube.audienceTrust !== 'number') safePlayer.youtube.audienceTrust = 55;
          if (typeof safePlayer.youtube.fanMood !== 'number') safePlayer.youtube.fanMood = 55;
          if (typeof safePlayer.youtube.controversy !== 'number') safePlayer.youtube.controversy = 0;
          if (typeof safePlayer.youtube.membershipsActive !== 'boolean') safePlayer.youtube.membershipsActive = false;
          if (typeof safePlayer.youtube.members !== 'number') safePlayer.youtube.members = 0;
          if (typeof safePlayer.youtube.lastLivestreamWeek !== 'number') safePlayer.youtube.lastLivestreamWeek = 0;
          if (typeof safePlayer.youtube.lastMerchDropWeek !== 'number') safePlayer.youtube.lastMerchDropWeek = 0;
          if (!safePlayer.youtube.creatorIdentity) safePlayer.youtube.creatorIdentity = 'ACTOR_VLOGGER';
          if (typeof safePlayer.youtube.lastIdentityChangeWeek !== 'number') safePlayer.youtube.lastIdentityChangeWeek = 0;

          if (!safePlayer.finance || typeof safePlayer.finance !== 'object') {
              safePlayer.finance = {
                  history: [],
                  yearly: [],
                  loans: [],
                  credit: { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 }
              };
          } else {
              if (!Array.isArray(safePlayer.finance.history)) safePlayer.finance.history = [];
              if (!Array.isArray(safePlayer.finance.yearly)) safePlayer.finance.yearly = [];
              if (!Array.isArray((safePlayer.finance as any).loans)) (safePlayer.finance as any).loans = [];
              if (!(safePlayer.finance as any).credit || typeof (safePlayer.finance as any).credit !== 'object') {
                  (safePlayer.finance as any).credit = { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 };
              }
          }

          if (!safePlayer.relationships || safePlayer.relationships.length === 0) safePlayer.relationships = [...INITIAL_PLAYER.relationships];
          
          // FIX: Patch broken avatars
          if (safePlayer.relationships) {
              safePlayer.relationships = safePlayer.relationships.map((rel: any) => {
                  let patchedRel = { ...rel };

                  if (patchedRel.id === 'rel_mom' && (patchedRel.image.includes('seed=Mom') || patchedRel.image === '')) {
                      patchedRel = { ...patchedRel, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Sophie' };
                  }
                  if (patchedRel.id === 'rel_dad' && (patchedRel.image.includes('seed=Dad') || patchedRel.image === '')) {
                      patchedRel = { ...patchedRel, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Arthur' };
                  }

                  if ((patchedRel.relation === 'Parent' || patchedRel.relation === 'Deceased Parent') && typeof patchedRel.age !== 'number') {
                      const fallbackAgeGap = patchedRel.id === 'rel_mom' || /mom|mother/i.test(patchedRel.name) ? 28 : 31;
                      patchedRel.age = safePlayer.age + fallbackAgeGap;
                  }

                  if ((patchedRel.relation === 'Child' || patchedRel.relation === 'Sibling') && typeof patchedRel.birthWeekAbsolute !== 'number' && typeof patchedRel.age === 'number') {
                      patchedRel.birthWeekAbsolute = Math.max(0, getAbsoluteWeek(safePlayer.age, safePlayer.currentWeek) - (patchedRel.age * 52));
                  }

                  if ((patchedRel.relation === 'Child' || patchedRel.relation === 'Sibling') && typeof patchedRel.birthWeekAbsolute === 'number') {
                      patchedRel.age = getRelationshipAge(patchedRel, safePlayer.age, safePlayer.currentWeek);
                  }

                  if (typeof patchedRel.lastInteractionAbsolute !== 'number') {
                      patchedRel.lastInteractionAbsolute = Math.max(0, getAbsoluteWeek(safePlayer.age, safePlayer.currentWeek) - Math.max(0, safePlayer.currentWeek - (patchedRel.lastInteractionWeek || safePlayer.currentWeek)));
                  }

                  return patchedRel;
              });
          }

          if (safePlayer.weeklyOpportunities.jobs.length === 0) {
              const usedTitles = [...safePlayer.commitments.map((c: any) => c.name), ...safePlayer.activeReleases.map((r: any) => r.name), ...safePlayer.pastProjects.map((p: any) => p.name)];
              safePlayer.weeklyOpportunities = { auditions: generateAuditions(safePlayer, usedTitles), jobs: generatePartTimeJobs() };
          }

          if (safePlayer.instagram.feed.length === 0) safePlayer.instagram.feed = generateWeeklyFeed(safePlayer);
          
          if (!Array.isArray(safePlayer.awards)) safePlayer.awards = [];
          safePlayer.awards = dedupeAwards(safePlayer.awards);
          if (!Array.isArray(safePlayer.scheduledEvents)) safePlayer.scheduledEvents = [];
          if (!safePlayer.dating) safePlayer.dating = { isTinderActive: false, isLuxeActive: false, preferences: { gender: 'ALL', minAge: 18, maxAge: 35 }, matches: [], luxeRefreshOffset: 0, luxeCycleStartAbsoluteWeek: 0 };
          if (typeof safePlayer.dating.luxeRefreshOffset !== 'number') safePlayer.dating.luxeRefreshOffset = 0;
          if (typeof safePlayer.dating.luxeCycleStartAbsoluteWeek !== 'number') safePlayer.dating.luxeCycleStartAbsoluteWeek = 0;
          if (!safePlayer.flags) safePlayer.flags = {};
          if (typeof safePlayer.flags.weeklyBaseEnergyRemaining !== 'number') {
              safePlayer.flags.weeklyBaseEnergyRemaining = Math.max(0, Math.min(100, safePlayer.energy.current));
          }
          if (typeof safePlayer.flags.bonusEnergyBank !== 'number') {
              safePlayer.flags.bonusEnergyBank = Math.max(0, safePlayer.energy.current - safePlayer.flags.weeklyBaseEnergyRemaining);
          }
          if (!Array.isArray(safePlayer.flags.premiumPurchases)) safePlayer.flags.premiumPurchases = [];
          if (!Array.isArray(safePlayer.flags.premiumCollections)) safePlayer.flags.premiumCollections = [];
          if (typeof safePlayer.flags.bailoutAdsUsedThisWeek !== 'number') safePlayer.flags.bailoutAdsUsedThisWeek = 0;
          syncEnergyDisplay(safePlayer);

          if (!safePlayer.businesses) safePlayer.businesses = [];
          safePlayer.businesses = safePlayer.businesses.map((biz: any) => {
              if (biz.type !== 'PRODUCTION_HOUSE') return biz;
              const normalizedStudioState = normalizeStudioState(biz.studioState, safePlayer.currentWeek || 1);
              const normalizedStudioStateWithLegacyUniverses = normalizedStudioState as any;
              return {
                  ...biz,
                  studioState: {
                      ...normalizedStudioState,
                      universes: Array.isArray(normalizedStudioStateWithLegacyUniverses.universes)
                          ? normalizedStudioStateWithLegacyUniverses.universes.map((universe: any) => {
                              const normalizedUniverse = normalizeUniverseMap({ [universe?.id || 'CUSTOM_UNIVERSE']: universe });
                              const resolved = Object.values(normalizedUniverse).find((entry: any) => entry.id === universe?.id) || universe;
                              return safePlayer.world.universes[resolved.id] || resolved;
                          })
                          : [],
                  },
              };
          });
          safePlayer.pastProjects = safePlayer.pastProjects.map((project: any) => ({
              ...project,
              awards: dedupeAwards(project.awards || [])
          }));
          safePlayer.awards = dedupeAwards(safePlayer.awards || []);
          if (safePlayer.business) {
              const legacyName = String(safePlayer.business.type || '');
              const alreadyHasProductionHouse = safePlayer.businesses.some((biz: any) => biz.type === 'PRODUCTION_HOUSE');
              const indMap: Record<string, any> = {
                  'Cafe': { type: 'CAFE', subtype: 'COFFEE_SHOP', emoji: '☕' },
                  'Online Brand': { type: 'FASHION', subtype: 'STREETWEAR', emoji: '👕' },
                  'Production House': { type: 'PRODUCTION_HOUSE', subtype: 'MAJOR_STUDIO', emoji: '🎬' }
              };
              const mapped = indMap[legacyName] || { type: 'RESTAURANT', subtype: 'CASUAL_DINING', emoji: '🍽️' };

              // Legacy saves used a single `business` object. Do not downgrade an old
              // production house into merch during migration, and avoid duplicates if a
              // newer `businesses` entry already exists.
              if (mapped.type !== 'PRODUCTION_HOUSE' || !alreadyHasProductionHouse) {
                  const newBiz = createBusiness(
                      safePlayer.business.name,
                      mapped.type,
                      mapped.subtype,
                      { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' },
                      mapped.emoji,
                      safePlayer.currentWeek,
                      safePlayer.homeIndustryId
                  );
                  const legacyInvestment = Math.max(0, Number(safePlayer.business.totalInvestment || 0));
                  if (legacyInvestment > 0) {
                      newBiz.stats.valuation = Math.max(newBiz.stats.valuation, legacyInvestment * 1.5);
                      newBiz.balance = Math.max(newBiz.balance, legacyInvestment * 0.2);
                      if (newBiz.type === 'PRODUCTION_HOUSE' && newBiz.studioState) {
                          newBiz.studioState.productionFund = Math.max(newBiz.studioState.productionFund || 0, legacyInvestment * 0.2);
                      }
                  }
                  safePlayer.businesses.push(newBiz);
              }
              delete safePlayer.business; 
          }
          if (!safePlayer.stocks || safePlayer.stocks.length === 0) {
              safePlayer.stocks = initializeStocks();
              safePlayer.portfolio = safePlayer.portfolio || [];
          } else {
              safePlayer.stocks = normalizeListedStocks(safePlayer.stocks);
          }
          return safePlayer;
      });
    }
  }, [gameStatus]);

  useEffect(() => {
      if (toastMessage) { const t = setTimeout(() => setToastMessage(null), 2500); return () => clearTimeout(t); }
  }, [toastMessage]);

  const handleUpdatePlayer = (updatedPlayer: Player) => { 
      const normalizedWorld = {
          ...clone(INITIAL_PLAYER.world),
          ...(updatedPlayer.world || {}),
          universes: normalizeUniverseMap(updatedPlayer.world?.universes)
      };
      setPlayer({
          ...updatedPlayer,
          world: normalizedWorld,
          awards: dedupeAwards(updatedPlayer.awards || []),
          pastProjects: (updatedPlayer.pastProjects || []).map((project: any) => ({
              ...project,
              awards: dedupeAwards(project.awards || [])
          }))
      }); 
  };

  const handleQueueBabyNamingCheat = () => {
      const nextPlayer = {
          ...player,
          flags: {
              ...player.flags,
              qaBabyNamingNextWeek: true,
          },
          logs: [{ week: player.currentWeek, year: player.age, message: '🍼 CHEAT: Baby naming test queued for next week.', type: 'positive' }, ...player.logs].slice(0, 50)
      };
      handleUpdatePlayer(nextPlayer);
      setToastMessage({ title: 'Baby QA Queued', subtext: 'Press Age Up once to open the naming flow.' });
  };

  const handleSchedulePregnancy = (request: PendingBabyNaming) => {
      handleGenericUpdate(prev => {
          if (prev.activePregnancy) {
              setToastMessage({ title: 'Pregnancy Already Active', subtext: 'A baby is already on the way.' });
              return prev;
          }

          const currentAbsoluteWeek = getAbsoluteWeek(prev.age, prev.currentWeek);
          const birthWeekAbsolute = Math.max(request.birthWeekAbsolute || 0, currentAbsoluteWeek + PREGNANCY_TERM_WEEKS);
          const weeksLeft = Math.max(1, birthWeekAbsolute - currentAbsoluteWeek);

          return {
              ...prev,
              activePregnancy: {
                  partnerId: request.partnerId,
                  partnerName: request.partnerName,
                  pregnancyCarrier: request.pregnancyCarrier || 'PARTNER',
                  babyGender: request.babyGender,
                  suggestedFirstName: request.suggestedFirstName,
                  conceptionWeekAbsolute: currentAbsoluteWeek,
                  birthWeekAbsolute,
                  weeksLeft,
                  shouldCreateScandalNews: request.shouldCreateScandalNews,
              },
          };
      }, `🍼 ${getPregnancyFeedbackCopy(request.pregnancyCarrier || 'PARTNER', request.partnerName).log}`);
      setToastMessage({ title: 'Pregnancy Confirmed', subtext: getPregnancyFeedbackCopy(request.pregnancyCarrier || 'PARTNER', request.partnerName).toast });
  };

  const handleNextWeek = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const traceName = 'process_game_week';
    const startedAt = performance.now();
    markTraceAction('process_week_started', {
      last_screen: Page[activePage] || String(activePage),
      flow: 'process_week',
      save_slot: currentSlot,
    });
    setCrashContext(player, {
      flow: 'process_week',
      screen: activePage,
      game_status: gameStatus,
      save_slot: currentSlot,
    });
    addBreadcrumb('process_week:start', {
      age: player.age,
      week: player.currentWeek,
      pendingEvents: player.pendingEvents?.length || 0,
      commitments: player.commitments?.length || 0,
    });
    markGameCheckpoint('process_week_start', player, {
      screen: activePage,
      pending_events: player.pendingEvents?.length || 0,
      commitments: player.commitments?.length || 0,
      active_releases: player.activeReleases?.length || 0,
    });
    startPerformanceTrace(traceName, {
      age: player.age,
      week: player.currentWeek,
      screen: activePage,
    });
    try {
        const { player: newPlayerState, triggerAd } = await processGameWeek(player);

        const afterDeals = processDealsWeekly(
          newPlayerState,
          player.stocks
        );
        
        const shouldTriggerBabyQa =
          !!afterDeals.flags?.qaBabyNamingNextWeek;
        
        let syncedPlayerState = shouldTriggerBabyQa
          ? {
              ...afterDeals,
              flags: {
                ...afterDeals.flags,
                qaBabyNamingNextWeek: false,
              },
            }
          : afterDeals;
        
        let babyNamingDue: PendingBabyNaming | null = null;
        if (syncedPlayerState.activePregnancy) {
            const pregnancy = syncedPlayerState.activePregnancy;
            const currentAbsoluteWeek = getAbsoluteWeek(syncedPlayerState.age, syncedPlayerState.currentWeek);
            const weeksLeft = typeof pregnancy.birthWeekAbsolute === 'number'
                ? pregnancy.birthWeekAbsolute - currentAbsoluteWeek
                : (pregnancy.weeksLeft || 1) - 1;

            if (weeksLeft <= 0) {
                const partnerName = pregnancy.partnerName
                    || syncedPlayerState.relationships.find(rel => rel.id === pregnancy.partnerId)?.name
                    || 'Your partner';
                babyNamingDue = {
                    partnerId: pregnancy.partnerId,
                    partnerName,
                    pregnancyCarrier: pregnancy.pregnancyCarrier || 'PARTNER',
                    babyGender: pregnancy.babyGender || (Math.random() > 0.5 ? 'MALE' : 'FEMALE'),
                    suggestedFirstName: pregnancy.suggestedFirstName || (Math.random() > 0.5 ? 'Leo' : 'Mia'),
                    birthWeekAbsolute: currentAbsoluteWeek,
                    eventWeek: syncedPlayerState.currentWeek,
                    eventYear: syncedPlayerState.age,
                    shouldCreateScandalNews: !!pregnancy.shouldCreateScandalNews,
                };
                syncedPlayerState = {
                    ...syncedPlayerState,
                    activePregnancy: undefined,
                    logs: [
                        { week: syncedPlayerState.currentWeek, year: syncedPlayerState.age, message: `🍼 The baby with ${partnerName} is here. Time to choose a name.`, type: 'positive' as const },
                        ...syncedPlayerState.logs,
                    ].slice(0, 50),
                };
            } else {
                syncedPlayerState = {
                    ...syncedPlayerState,
                    activePregnancy: {
                        ...pregnancy,
                        weeksLeft,
                        birthWeekAbsolute: pregnancy.birthWeekAbsolute || currentAbsoluteWeek + weeksLeft,
                    },
                };
            }
        }
        handleUpdatePlayer(syncedPlayerState);

        if (shouldTriggerBabyQa) {
            setPendingBabyNaming({
                partnerId: 'cheat_partner',
                partnerName: 'Jordan Vale',
                pregnancyCarrier: 'PARTNER',
                babyGender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
                suggestedFirstName: Math.random() > 0.5 ? 'Leo' : 'Mia',
                birthWeekAbsolute: getAbsoluteWeek(syncedPlayerState.age, syncedPlayerState.currentWeek),
                eventWeek: syncedPlayerState.currentWeek,
                eventYear: syncedPlayerState.age,
                shouldCreateScandalNews: false,
            });
        }
        if (babyNamingDue) {
            setPendingBabyNaming(babyNamingDue);
        }

        if (syncedPlayerState.flags?.isDead) {
            trackGameEvent('process_week_death_screen', {
                age: syncedPlayerState.age,
                week: syncedPlayerState.currentWeek,
            });
            setGameStatus('DEATH_SCREEN');
            return;
        }

        // Debt Check
        if (syncedPlayerState.money < 0) {
            setShowDebtModal(true);
        }

        // INTERSTITIAL AD TRIGGER (Every 12 Weeks)
        if (triggerAd && !hasNoAds(syncedPlayerState)) {
            setTimeout(async () => {
                await showAd('INTERSTITIAL');
            }, 800);
        }
        addBreadcrumb('process_week:success', {
            age: syncedPlayerState.age,
            week: syncedPlayerState.currentWeek,
            triggerAd,
        });
        markTraceAction('process_week_completed', {
            last_screen: Page[activePage] || String(activePage),
            flow: 'process_week',
            save_slot: currentSlot,
        });
        markGameCheckpoint('process_week_success', syncedPlayerState, {
            screen: activePage,
            trigger_ad: triggerAd,
            pending_events: syncedPlayerState.pendingEvents?.length || 0,
            active_releases: syncedPlayerState.activeReleases?.length || 0,
        });
        trackGameEvent('week_processed', {
            age: syncedPlayerState.age,
            week: syncedPlayerState.currentWeek,
            pending_events: syncedPlayerState.pendingEvents?.length || 0,
            commitments: syncedPlayerState.commitments?.length || 0,
            active_releases: syncedPlayerState.activeReleases?.length || 0,
        });
    } catch (error) {
        console.error('Week processing failed:', error);
        markTraceAction('process_week_failed', {
            last_screen: Page[activePage] || String(activePage),
            flow: 'process_week',
            save_slot: currentSlot,
        });
        recordFlowFailure(error, 'process_week', player, {
            screen: activePage,
            pending_events: player.pendingEvents?.length || 0,
            commitments: player.commitments?.length || 0,
            active_releases: player.activeReleases?.length || 0,
        });
        recordNonFatal(error, 'process_week_failed', {
            age: player.age,
            week: player.currentWeek,
            pending_events: player.pendingEvents?.length || 0,
            commitments: player.commitments?.length || 0,
            active_releases: player.activeReleases?.length || 0,
        });
        trackGameEvent('week_process_failed', {
            age: player.age,
            week: player.currentWeek,
        });
        setToastMessage({
            title: "Week Processing Failed",
            subtext: "The week could not finish. Please try again."
        });
    } finally {
        stopPerformanceTrace(traceName, { duration_ms: Math.round(performance.now() - startedAt) });
        setIsProcessing(false);
    }
  };

  const handlePressConferenceComplete = (statsDelta: any, buzzDelta: number, logMessage: string) => {
      if (!activePressEvent) return;
      const commitment = activePressEvent.project;
      handleGenericUpdate(prev => {
          const newStats = { ...prev.stats };
          if (statsDelta.fame) newStats.fame = Math.max(0, newStats.fame + statsDelta.fame);
          if (statsDelta.reputation) newStats.reputation = Math.max(0, Math.min(100, newStats.reputation + statsDelta.reputation));
          if (statsDelta.followers) newStats.followers = Math.max(0, newStats.followers + statsDelta.followers);
          const newBuzz = Math.max(-50, Math.min(50, (commitment.promotionalBuzz || 0) + buzzDelta));
          const updatedC = { ...commitment, promotionalBuzz: newBuzz, lastPressWeek: prev.currentWeek, lastPressAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek) };
          return { 
              ...prev, 
              stats: newStats, 
              commitments: prev.commitments.map(c => c.id === commitment.id ? updatedC : c),
              logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMessage, type: 'positive' }]
          };
      });
      setActivePressEvent(null);
      setToastMessage({ title: "Press Tour Complete", subtext: "News outlets are running the story." });
  };

  const handleSocialEventChoice = (option: any) => {
      if (!activeSocialEvent) return;
      handlePartnerAction(activeSocialEvent.partnerId, 'EVENT_RESOLUTION', option);
      setActiveSocialEvent(null);
  };

  // --- REWARDED AD SYSTEM (FIXED FOR MULTI-STEP) ---
  const handleTriggerRewardAd = async (type: AdType, data?: any) => {
      if (type === 'REWARDED_BAILOUT' && (player.flags?.bailoutAdsUsedThisWeek || 0) >= 2) {
          setToastMessage({ title: "Bailout Limit Reached", subtext: "You can only claim 2 bailout ads per week." });
          return;
      }

      const steps = (type === 'REWARDED_STATS') ? 2 : 1;
      setAdTotalSteps(steps);
      setAdStep(1);
      setIsShowingAd(true);

      let successCount = 0;
      
      try {
          for (let i = 1; i <= steps; i++) {
              setAdStep(i);
              
              // BUFFER: If this is the 2nd (or later) ad, wait 1.5s to let the ad engine reset
              // This prevents "Ad Not Ready" errors or UI hangs
              if (i > 1) {
                  await new Promise(resolve => setTimeout(resolve, 1500));
              }

              const result = await showAd(type); 
              
              if (result.success) {
                  successCount++;
              } else {
                  // If user cancels or ad fails, break loop
                  break;
              }
              
              // Tiny buffer after closing ad before updating UI or next step
              await new Promise(resolve => setTimeout(resolve, 500));
          }
      } catch (error) {
          console.error("Ad sequence error:", error);
      } finally {
          // CRITICAL FIX: This ensures the overlay ALWAYS closes, even if code crashes or hangs
          setIsShowingAd(false);
      }
      
      if (successCount === steps) {
          handleAdComplete(type, data);
      } else {
          setToastMessage({ title: "Reward Cancelled", subtext: "You must watch the complete ad." });
      }
  };

  const handleAdComplete = (type: AdType, data?: any) => {
      let toastTitle = "Reward Received";
      let toastSub = "";

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          
          if (type === 'REWARDED_CASH') {
              p.money += 5000;
              toastSub = "+$5,000";
          }
          else if (type === 'REWARDED_BAILOUT') {
              const bailoutAdsUsedThisWeek = p.flags?.bailoutAdsUsedThisWeek || 0;
              const currentDebt = Math.abs(p.money < 0 ? p.money : 0);
              const bailoutAmount = bailoutAdsUsedThisWeek === 0
                  ? Math.floor(currentDebt * 0.20) + 5000
                  : Math.floor(currentDebt * 0.10) + 2500;
              
              p.money += bailoutAmount;
              p.flags.bailoutAdsUsedThisWeek = bailoutAdsUsedThisWeek + 1;
              toastSub = `+$${bailoutAmount.toLocaleString()} Bailout Fund`;
              
              // Close debt modal if we are back in green
              if (p.money >= 0) {
                  setShowDebtModal(false);
              }
          }
          else if (type === 'REWARDED_ENERGY') {
              restoreWeeklyEnergy(p, 25);
              toastSub = "+25 Energy";
          }
          else if (type === 'REWARDED_STATS') {
              p.stats.health = Math.max(90, p.stats.health);
              p.stats.happiness = Math.max(90, p.stats.happiness);
              p.stats.looks = Math.max(90, p.stats.looks);
              p.stats.body = Math.max(90, p.stats.body);
              toastSub = "Full Wellness Restoration";
          }
          else if (type === 'REWARDED_SKILL' || type === 'REWARDED_GENRE') {
              const wallet = ensureSkillState(p);
              p.skillPoints = { ...wallet, earned: wallet.earned + 1 };
              toastSub = '+1 skill point';
          }
          
          setToastMessage({ title: toastTitle, subtext: toastSub });
          return p;
      });
  };

  const handlePremiumPurchase = async (productId: PremiumProductId) => {
      const result = await purchasePremiumProduct(productId);
      if (!result.success) {
          setToastMessage({ title: result.cancelled ? "Purchase Cancelled" : "Purchase Failed", subtext: result.message });
          return;
      }

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          const message = applyPremiumPurchase(p, productId);
          setToastMessage({ title: "Purchase Confirmed", subtext: message });
          return p;
      });
  };

  const handleBuyLifestyleItem = (item: any) => {
      handleGenericUpdate(p => {
          const nextPlayer = {
              ...p,
              money: p.money - item.price,
              assets: [...p.assets, item.id],
              customItems: item.id.includes('_cust_') ? [...p.customItems, item as any] : p.customItems,
          };

          const premiumCollection = getRequiredPremiumProductForAsset(item.id);
          let logMessage = `Added ${item.name} to your lifestyle collection.`;

          if (premiumCollection === 'bundle_luxury_homes') {
              nextPlayer.news = [{
                  id: `news_home_buy_${Date.now()}`,
                  headline: `${nextPlayer.name} upgrades their address with ${item.name}`,
                  subtext: `The move is already being read as a statement about status, privacy, and how far the star lifestyle has expanded.`,
                  category: 'TOP_STORY' as const,
                  week: nextPlayer.currentWeek,
                  year: nextPlayer.age,
                  impactLevel: 'MEDIUM' as const,
              }, ...nextPlayer.news].slice(0, 50);
              nextPlayer.x.feed = [{
                  id: `x_home_buy_${Date.now()}`,
                  authorId: 'x_home_buy',
                  authorName: 'RealEstateWire',
                  authorHandle: '@realestatewire',
                  authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=RealEstateWire',
                  content: `${nextPlayer.name} just picked up ${item.name}. Celebrity real-estate brain is fully activated now.`,
                  timestamp: Date.now(),
                  likes: 12000,
                  retweets: 1800,
                  replies: 400,
                  isPlayer: false,
                  isLiked: false,
                  isRetweeted: false,
                  isVerified: true,
              }, ...nextPlayer.x.feed].slice(0, 50);
              logMessage = `🏠 Bought ${item.name}. Your social circle is already treating the new address like a status move.`;
          } else if (premiumCollection === 'bundle_elite_vehicles') {
              nextPlayer.x.feed = [{
                  id: `x_vehicle_buy_${Date.now()}`,
                  authorId: 'x_vehicle_buy',
                  authorName: 'GarageWatch',
                  authorHandle: '@garagewatch',
                  authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=GarageWatch',
                  content: `${nextPlayer.name} just added ${item.name} to the garage. That is not transport, that is messaging.`,
                  timestamp: Date.now(),
                  likes: 15000,
                  retweets: 2300,
                  replies: 520,
                  isPlayer: false,
                  isLiked: false,
                  isRetweeted: false,
                  isVerified: true,
              }, ...nextPlayer.x.feed].slice(0, 50);
              logMessage = `🚘 Bought ${item.name}. The garage just became part of your celebrity image.`;
          } else if (premiumCollection === 'bundle_sky_sea') {
              nextPlayer.news = [{
                  id: `news_skysea_buy_${Date.now()}`,
                  headline: `${nextPlayer.name} adds ${item.name} to a growing luxury fleet`,
                  subtext: `The purchase pushes the star further into full jet-set fantasy, and people are absolutely noticing.`,
                  category: 'TOP_STORY' as const,
                  week: nextPlayer.currentWeek,
                  year: nextPlayer.age,
                  impactLevel: 'MEDIUM' as const,
              }, ...nextPlayer.news].slice(0, 50);
              logMessage = `🛥️ Bought ${item.name}. Your life now reads like a private-travel fantasy.`;
          } else if (premiumCollection === 'bundle_ultimate_lifestyle') {
              nextPlayer.x.feed = [{
                  id: `x_lifestyle_buy_${Date.now()}`,
                  authorId: 'x_lifestyle_buy',
                  authorName: 'Style Radar',
                  authorHandle: '@styleradar',
                  authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=StyleRadar',
                  content: `${nextPlayer.name} just picked up ${item.name}. Luxury-watch and style accounts are going to have a field day.`,
                  timestamp: Date.now(),
                  likes: 18000,
                  retweets: 2600,
                  replies: 700,
                  isPlayer: false,
                  isLiked: false,
                  isRetweeted: false,
                  isVerified: true,
              }, ...nextPlayer.x.feed].slice(0, 50);
              logMessage = `💎 Bought ${item.name}. Style buzz around your image just got noticeably louder.`;
          }

          nextPlayer.logs = [...nextPlayer.logs, { week: nextPlayer.currentWeek, year: nextPlayer.age, message: logMessage, type: 'positive' as const }].slice(-50);
          return appendLedger(nextPlayer, -Math.round(item.price || 0), 'ASSET', `Bought ${item.name}`);
      });
  };

  const handleSellLifestyleItem = (id: string) => handleGenericUpdate(p => {
      const it = [...PROPERTY_CATALOG, ...CAR_CATALOG, ...CLOTHING_CATALOG].find(x => x.id === id);
      const payout = it ? Math.round(it.price * 0.5) : 0;
      let next: Player = {
          ...p,
          money: p.money + payout,
          assets: p.assets.filter(a => a !== id),
          logs: [...(p.logs || []), { week: p.currentWeek, year: p.age, message: it ? `Sold ${it.name} for $${payout.toLocaleString()}.` : 'Sold an asset.', type: 'neutral' as const }].slice(-50),
      };
      next = appendLedger(next, payout, 'ASSET', it ? `Sold ${it.name}` : 'Sold an asset');
      if (payout >= 25000 && it) {
          next = appendNews(next, {
              id: `news_sell_${Date.now()}`,
              headline: `${next.name} lets go of ${it.name}`,
              subtext: 'The sale hits the same treasury as the rest of the career.',
              category: 'YOU',
              impactLevel: 'LOW',
          });
      }
      return next;
  });

  const handleRestorePurchases = async () => {
      const result = await restorePremiumPurchases();
      if (!result.success) {
          setToastMessage({ title: "Restore Failed", subtext: result.message });
          return;
      }

      if (result.restoredProductIds.length === 0) {
          setToastMessage({ title: "Nothing to Restore", subtext: result.message });
          return;
      }

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          result.restoredProductIds.forEach(productId => {
              applyPremiumPurchase(p, productId);
          });
          setToastMessage({ title: "Purchases Restored", subtext: `${result.restoredProductIds.length} item(s) restored.` });
          return p;
      });
  };

  // --- HANDLERS ---
  const handleStartGame = (draft: CharacterDraft) => {
      const parentRelationships = INITIAL_PLAYER.relationships.map((rel, index) => ({
          ...rel,
          age: draft.age + (index === 0 ? 28 : 31),
      }));
      const seeded = applyCharacterDraft({ ...INITIAL_PLAYER, relationships: parentRelationships }, draft, 'new');
      applyNpcEconomy(null);
      if (currentSlot) {
          setSaveSlots(prev => ({ ...prev, [currentSlot]: seeded }));
      }
      setPlayer(seeded);
      setGameStatus('PLAYING');
      void saveCharacterProfile(seeded);
  };

  const handleCreateCharacter = (draft: CharacterDraft) => {
      handleGenericUpdate(prev => {
          const next = applyCharacterDraft(prev, draft, 'existing');
          void saveCharacterProfile(next);
          return next;
      });
      setToastMessage({ title: 'Character saved', subtext: 'Profiles on X, Instagram, and YouTube were created with this star.' });
  };

  const handleEditLook = (face: CartoonFace) => {
      handleGenericUpdate(prev => {
          const next = applyAppearance(prev, face);
          void saveCharacterProfile(next);
          return next;
      });
  };

  const handleAddTalent = (draft: CustomTalentDraft) => {
      const built = buildCustomTalent(draft);
      if (!built.npc) {
          setToastMessage({ title: 'Could not add actor', subtext: built.error || 'Check the sheet.' });
          return;
      }
      handleGenericUpdate(prev => ({
          ...prev,
          customTalent: [...(prev.customTalent || []), built.npc!],
      }));
      setToastMessage({ title: 'Custom talent added', subtext: `${built.npc.name} is in the casting pools.` });
  };

  const handleSpendEarned = (target: Parameters<typeof raisePlayerSkill>[1]) => {
      handleGenericUpdate(prev => {
          const result = raisePlayerSkill(prev, target);
          if (result.error) setToastMessage({ title: 'Not spent', subtext: result.error });
          return result.player;
      });
  };

  const handleSpendPremium = async (target: Parameters<typeof raisePlayerSkill>[1]) => {
      const current = player;
      const skills = current.stats.skills;
      const value = target.kind === 'acting' ? (skills?.[target.key] || 0) : (current.stats.genreXP?.[target.key] || 0);
      const cost = costForNextLevel(levelOf(value));
      if (cost <= 0) return;
      const requestId = `spend_${target.kind}_${target.key}_${Date.now()}`;
      const confirmed = await spendPremiumOnServer(cost, requestId);
      if (!confirmed.ok) {
          setToastMessage({ title: 'Premium points stayed put', subtext: confirmed.message });
          return;
      }
      handleGenericUpdate(prev => raiseWithConfirmedPremium(prev, target, confirmed.premiumBalance, confirmed.characterUnlock));
      setToastMessage({ title: 'Level bought', subtext: confirmed.message });
  };

  const handleSkillPointPurchase = async (productId: SkillPointProductId) => {
      const purchase = await requestSkillPointPurchase(productId);
      if (!purchase.ok) {
          setToastMessage({ title: purchase.cancelled ? 'Purchase cancelled' : 'Purchase not completed', subtext: purchase.message });
          return;
      }
      const credit = await confirmSkillPointCredit(purchase);
      if (!credit.ok) {
          setToastMessage({ title: 'Not credited', subtext: credit.message });
          return;
      }
      handleGenericUpdate(prev => rememberPremiumSnapshot(prev, credit.premiumBalance, credit.characterUnlock, credit.receipt));
      setToastMessage({ title: 'Purchase confirmed', subtext: credit.message });
  };

  const handleRestoreSkillPoints = async () => {
      const credit = await restoreSkillPointPurchases();
      if (!credit.ok) {
          setToastMessage({ title: 'Restore failed', subtext: credit.message });
          return;
      }
      handleGenericUpdate(prev => rememberPremiumSnapshot(prev, credit.premiumBalance, credit.characterUnlock, credit.receipt));
      setToastMessage({ title: 'Wallet updated', subtext: credit.message });
  };

  const handleOpenDeathSummaryPreview = () => {
      setDeathScreenPreviewPlayer(clone(player));
  };

  const handleContinueAsChild = (child: any) => {
      const inheritancePreview = getLegacyInheritancePreview(player);
      const inheritedRelationships: Relationship[] = [];
      player.relationships.forEach(rel => {
          if (rel.id === child.id) return; // Skip self
          if (rel.relation === 'Spouse' || rel.relation === 'Partner') {
              inheritedRelationships.push({ ...rel, relation: 'Parent' });
          } else if (rel.relation === 'Child') {
              inheritedRelationships.push({ ...rel, relation: 'Sibling' });
          }
      });
      
      // Add the current player as a parent
      inheritedRelationships.push({
          id: player.id,
          name: player.name,
          relation: player.flags.isDead ? 'Deceased Parent' as any : 'Parent',
          closeness: 100,
          age: player.age,
          gender: player.gender,
          image: player.avatar,
          lastInteractionWeek: player.currentWeek,
          lastInteractionAbsolute: getAbsoluteWeek(player.age, player.currentWeek)
      });

      const childAge = getRelationshipAge(child, player.age, player.currentWeek);
      const yearsToSkip = Math.max(0, LEGACY_MIN_PLAYABLE_AGE - childAge);
      const advancedRelationships = inheritedRelationships.map(rel => ({
          ...rel,
          age: typeof rel.age === 'number' ? rel.age + yearsToSkip : rel.age,
      }));
      const inheritedSkills = inheritActorSkills(player.stats.skills, 0.35);
      const inheritedGenreXP = Object.fromEntries(
          Object.entries(player.stats.genreXP).map(([genre, xp]) => [genre, Math.floor((xp as number) * 0.15)])
      ) as Record<string, number>;
      const inheritedWriterStats = player.writerStats
          ? {
                creativity: Math.floor(player.writerStats.creativity * 0.2),
                dialogue: Math.floor(player.writerStats.dialogue * 0.2),
                structure: Math.floor(player.writerStats.structure * 0.2),
                pacing: Math.floor(player.writerStats.pacing * 0.2),
            }
          : INITIAL_PLAYER.writerStats;
      const inheritedDirectorStats = player.directorStats
          ? {
                vision: Math.floor(player.directorStats.vision * 0.2),
                technical: Math.floor(player.directorStats.technical * 0.2),
                leadership: Math.floor(player.directorStats.leadership * 0.2),
                style: Math.floor(player.directorStats.style * 0.2),
            }
          : INITIAL_PLAYER.directorStats;
      const childHandle = `@${child.name.replace(/\s+/g, '_').toLowerCase()}`;

      const newPlayer: Player = {
          ...INITIAL_PLAYER,
          id: `player_${Date.now()}`,
          name: child.name,
          age: Math.max(childAge, LEGACY_MIN_PLAYABLE_AGE),
          currentWeek: player.currentWeek,
          gender: child.gender || player.gender,
          avatar: child.image || INITIAL_PLAYER.avatar,
          money: inheritancePreview.inheritedMoney,
          assets: [...player.assets],
          customItems: clone(player.customItems),
          residenceId: player.residenceId,
          businesses: clone(player.businesses || []),
          studio: player.studio ? clone(player.studio) : undefined,
          stocks: clone(player.stocks),
          portfolio: clone(inheritancePreview.inheritedPortfolio),
          world: player.world ? clone(player.world) : INITIAL_PLAYER.world,
          relationships: advancedRelationships,
          stats: {
              ...INITIAL_PLAYER.stats,
              health: Math.max(65, Math.floor(player.stats.health * 0.75)),
              happiness: Math.max(60, Math.floor(player.stats.happiness * 0.7)),
              fame: Math.floor(player.stats.fame * 0.2),
              reputation: Math.floor(player.stats.reputation * 0.3),
              talent: Math.floor(player.stats.talent * 0.45),
              looks: Math.max(35, Math.floor(player.stats.looks * 0.6)),
              body: Math.max(35, Math.floor(player.stats.body * 0.6)),
              followers: Math.floor(player.stats.followers * 0.12),
              skills: inheritedSkills,
              genreXP: inheritedGenreXP,
          },
          writerStats: inheritedWriterStats,
          directorStats: inheritedDirectorStats,
          instagram: { ...INITIAL_PLAYER.instagram, handle: childHandle },
          x: { ...INITIAL_PLAYER.x, handle: childHandle, followers: Math.floor(player.stats.followers * 0.04) },
          youtube: { ...INITIAL_PLAYER.youtube, handle: childHandle },
          bloodline: [
              ...(player.bloodline || []),
              createBloodlineSnapshot(player)
          ]
      };

      if (yearsToSkip > 0) {
          newPlayer.logs = [
              ...newPlayer.logs,
              {
                  week: newPlayer.currentWeek,
                  year: newPlayer.age,
                  message: `Your heir was too young to take over immediately. Time passed until ${child.name} turned ${LEGACY_MIN_PLAYABLE_AGE}.`,
                  type: 'neutral' as const
              }
          ].slice(-50);
      }
      if (inheritancePreview.moneyTaxPaid > 0 || inheritancePreview.sharesTaxPaid > 0) {
          newPlayer.logs = [
              ...newPlayer.logs,
              {
                  week: newPlayer.currentWeek,
                  year: newPlayer.age,
                  message: `Inheritance tax claimed $${inheritancePreview.moneyTaxPaid.toLocaleString()} in cash and ${inheritancePreview.sharesTaxPaid.toLocaleString()} stock shares. Properties, vehicles, businesses, and other assets transferred to the heir untouched.`,
                  type: 'neutral' as const
              }
          ].slice(-50);
      }
      syncCurrentSlotSnapshot(newPlayer);
      setPlayer(newPlayer);
      setGameStatus('PLAYING');
      setActivePage(Page.HOME);
  };

  
  const handleEventComplete = (updatedPlayer: Player) => {
      setPlayer(promotePendingEvent({ ...updatedPlayer, pendingEvent: null }));
  };

  const resolveQueuedEventSafely = (
      sourcePlayer: Player,
      updatedPlayer: Player,
      resolvedEventId: string | undefined,
      log: string,
      logType: 'positive' | 'negative' | 'neutral' = 'neutral'
  ) => {
      try {
          const sourceQueue = Array.isArray(sourcePlayer.pendingEvents) ? sourcePlayer.pendingEvents : [];
          const updatedQueue = Array.isArray(updatedPlayer.pendingEvents) ? updatedPlayer.pendingEvents : sourceQueue;
          const queueToFilter = sourceQueue.length > 0 ? sourceQueue : updatedQueue;
          const newPendingEvents = resolvedEventId
              ? queueToFilter.filter(event => event?.id !== resolvedEventId)
              : queueToFilter.slice(1);
          const nextLogs = [
              {
                  week: updatedPlayer.currentWeek ?? sourcePlayer.currentWeek,
                  year: updatedPlayer.age ?? sourcePlayer.age,
                  message: log || 'Event resolved.',
                  type: logType
              },
              ...(updatedPlayer.logs || sourcePlayer.logs || [])
          ].slice(0, 50);

          handleUpdatePlayer({
              ...updatedPlayer,
              pendingEvents: newPendingEvents,
              logs: nextLogs
          });
      } catch (error) {
          console.error('Queued event resolution failed:', error);
          setToastMessage({
              title: 'Event Recovery',
              subtext: 'That event could not close. Please tap Continue again.'
          });
          throw error;
      }
  };
  
  const handleRestartCareer = async () => {
    if (currentSlot) {
        await deleteGameData(slotSaveKey(currentSlot));
        setSaveSlots(prev => ({ ...prev, [currentSlot]: null }));
        applyNpcEconomy(null);
        setPlayer(INITIAL_PLAYER);
        setGameStatus('CREATION');
        setShowDebtModal(false);
    }
  };

  const handleQuitJob = (id: string) => handleGenericUpdate(p => {
      const previousCommitments = p.commitments;
      const next: Player = {
          ...p,
          commitments: p.commitments.filter(c => c.id !== id),
          logs: [...p.logs, { week: p.currentWeek, year: p.age, message: "Quit job.", type: 'neutral' }]
      };
      syncWeeklyEnergyForCommitments(next, previousCommitments);
      return next;
  });

  const handleFoundCompany = () => {
      handleGenericUpdate(current => {
          const result = foundEmpire(current);
          if (result.error) {
              setToastMessage({ title: 'Cannot found Empire+', subtext: result.error });
              return current;
          }
          if (result.player === current) return current;
          if (!platformAlreadyUnlocked(current)) {
              setToastMessage({
                  title: 'Empire+ founded',
                  subtext: `${formatCompact(FOUNDING_CAPITAL_USD)} moved from your cash into the company treasury.`,
              });
          }
          return result.player;
      });
  };

  const handleAcquirePlatform = (stockId: string, financing?: BuyFinancing) => handleGenericUpdate(current => {
      if (!platformAlreadyUnlocked(current)) {
          setToastMessage({
              title: 'Found Empire+ first',
              subtext: `Founding takes ${formatCompact(FOUNDING_CAPITAL_USD)} of your cash. That cheque becomes the treasury.`,
          });
          return current;
      }
      const result = purchasePlatform(current, stockId, financing);
      if (result.error) {
          setToastMessage({ title: 'Could not buy that service', subtext: result.error });
          return current;
      }
      const bought = result.player.ownPlatform?.ownedStreamers?.slice(-1)[0];
      setToastMessage({ title: 'Streaming service acquired', subtext: bought ? `${bought.name} now sits inside your company.` : 'The service is on your books.' });
      const named = bought?.name || 'a streaming service';
      let signaled = appendNews(result.player, {
          id: `news_acquire_${Date.now()}`,
          headline: `${result.player.name} buys ${named}`,
          subtext: 'The purchase leaves the career treasury and shows up on the Empire+ books.',
          category: 'YOU',
          impactLevel: 'MEDIUM',
      });
      signaled = appendBuzz(signaled, `${signaled.name} just bought ${named}. One company, one treasury.`);
      return signaled;
  });

  const handleTradeStock = (stockId: string, amount: number) => {
      const msg = amount > 0 ? 'Bought stock' : 'Sold stock';
      handleGenericUpdate(p => {
          const stocks = p.stocks || [];
          const portfolio = p.portfolio || [];
          const stock = stocks.find(s => s.id === stockId);
          if (!stock || !Number.isFinite(stock.price) || !Number.isFinite(amount) || amount === 0) return p;
          const shares = Math.abs(Math.trunc(amount));
          if (shares <= 0) return p;
          const totalCost = stock.price * shares;
          const writeLedger = (next: Player, cash: number, description: string): Player => {
              if (!next.finance) return next;
              const history = Array.isArray(next.finance.history) ? next.finance.history : [];
              return {
                  ...next,
                  finance: {
                      ...next.finance,
                      history: [{
                          id: `tx_stock_${Date.now()}`,
                          week: next.currentWeek,
                          year: next.age,
                          amount: Math.trunc(cash),
                          category: 'ASSET' as const,
                          description,
                      }, ...history].slice(0, 200),
                  },
              };
          };
          if (amount > 0) {
              if (p.money < totalCost) {
                  setToastMessage({ title: 'Not enough cash', subtext: 'That many shares cost more than the treasury.' });
                  return p;
              }
              const existing = portfolio.find(i => i.stockId === stockId);
              const newPort = existing ? portfolio.map(i => i.stockId === stockId ? { ...i, shares: i.shares + shares } : i) : [...portfolio, { stockId, shares }];
              let next: Player = { ...p, stocks, money: p.money - totalCost, portfolio: newPort, logs: [...(p.logs || []), { week: p.currentWeek, year: p.age, message: `${msg}: ${shares} ${stock.symbol}`, type: 'neutral' as const }] };
              next = writeLedger(next, -Math.round(totalCost), `Bought ${shares} ${stock.symbol}`);
              return appendNews(next, {
                  id: `news_buy_${stock.symbol}_${Date.now()}`,
                  headline: `${next.name} buys ${shares} shares of ${stock.symbol}`,
                  category: 'YOU',
                  impactLevel: 'LOW',
              });
          }
          const existing = portfolio.find(i => i.stockId === stockId);
          if (!existing || existing.shares < shares) {
              setToastMessage({ title: 'Not enough shares', subtext: 'You cannot sell shares you do not hold.' });
              return p;
          }
          const newPort = existing.shares === shares ? portfolio.filter(i => i.stockId !== stockId) : portfolio.map(i => i.stockId === stockId ? { ...i, shares: i.shares - shares } : i);
          let next: Player = { ...p, stocks, money: p.money + totalCost, portfolio: newPort, logs: [...(p.logs || []), { week: p.currentWeek, year: p.age, message: `${msg}: ${shares} ${stock.symbol}`, type: 'neutral' as const }] };
          next = writeLedger(next, Math.round(totalCost), `Sold ${shares} ${stock.symbol}`);
          return appendNews(next, {
              id: `news_sell_${stock.symbol}_${Date.now()}`,
              headline: `${next.name} sells ${shares} shares of ${stock.symbol}`,
              category: 'YOU',
              impactLevel: 'LOW',
          });
      });
  };

  const openPage = (page: Page) => {
      if (page === Page.MOBILE) setPhoneLaunch({ app: 'HOME' });
      setActivePage(page);
      setIsBottomNavVisible(true);
  };

  const openPhone = (launch: PhoneLaunch) => {
      setPhoneLaunch(launch);
      setActivePage(Page.MOBILE);
      setIsBottomNavVisible(true);
  };

  const openLifestyle = (view: LifestyleDestination) => {
      setLifestyleInitialView(view);
      setActivePage(Page.LIFESTYLE);
      setIsBottomNavVisible(view === 'MAIN');
  };

  const openLifestyleRef = useRef(openLifestyle);
  openLifestyleRef.current = openLifestyle;
  useEffect(() => {
      const onOpen = () => openLifestyleRef.current('PRODUCTION_GAME');
      window.addEventListener('ae-open-production', onOpen);
      const startCommissions = () => {
          try { localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_DISPLAY_VERSION); } catch { /* private mode */ }
          setShowWhatsNewModal(false);
          setPlayer(current => seedCommissionPlaytest(current));
          setGameStatus('PLAYING');
          setActivePage(Page.LIFESTYLE);
          setLifestyleInitialView('PRODUCTION_GAME');
      };
      if (import.meta.env.DEV) {
          (window as Window & { __aeCommissions?: { start: () => void } }).__aeCommissions = { start: startCommissions };
          const params = new URLSearchParams(window.location.search);
          if (params.get('commissions') === '1') startCommissions();
          const empire = params.get('empire');
          if (empire) {
              try { localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_DISPLAY_VERSION); } catch { /* private mode */ }
              setShowWhatsNewModal(false);
              const steps: Record<string, number> = { intro: 0, name: 0, markets: 1, clearance: 2, ident: 3, store: 4, shelf: 5, price: 6, blueprint: 7 };
              setCurrentSlot(1);
              setPlayer(current => {
                  if (empire === 'gate' || empire === 'gate-short') {
                      const { ownPlatform: _drop, ...rest } = current;
                      return {
                          ...rest,
                          money: empire === 'gate' ? 200_000_000 : 40_000_000,
                          flags: { ...(current.flags || {}), ownPlatformUnlocked: false },
                      };
                  }
                  const personalFloor = 212_400_000 + (platformAlreadyUnlocked(current) ? 0 : FOUNDING_CAPITAL_USD);
                  const rich = { ...current, money: Math.max(current.money || 0, personalFloor) };
                  const seeded = platformAlreadyUnlocked(rich) ? ensureOwnPlatform(rich) : foundEmpire(rich).player;
                  const state = seeded.ownPlatform!;
                  if (empire === 'legacy') {
                      const { sites: _sites, hqCityId: _hq, hqPromptSeen: _seen, offices: _offices, buildGoal: _goal, loadTest: _test, incidents: _incidents, ...rest } = state;
                      return {
                          ...seeded,
                          ownPlatform: syncRegions({
                              ...rest,
                              introSeen: true,
                              stage: 'BUILD',
                              buildStep: 0,
                              defineStep: 7,
                              selectedCountryIds: ['US', 'IN'],
                              regions: [
                                  { regionId: 'NORTH_AMERICA', scout: 2, workhorse: 1, titan: 0 },
                                  { regionId: 'ASIA', scout: 0, workhorse: 3, titan: 1 },
                              ],
                          }),
                      };
                  }
                  const alreadyPlaying = Boolean(state.hqCityId || state.hqPromptSeen || state.sites?.length || state.offices?.length);
                  if (alreadyPlaying) return seeded;
                  const showIntro = empire === '1' || empire === 'intro';
                  return {
                      ...seeded,
                      ownPlatform: syncRegions({
                          ...state,
                          defineLayout: 2,
                          introSeen: !showIntro,
                          defineStep: showIntro ? 0 : (steps[empire] ?? 0),
                          buildStep: 0,
                          stage: empire === 'ops' ? 'LIVE' : empire === 'build' ? 'BUILD' : 'DEFINE',
                          selectedCountryIds: state.selectedCountryIds.length ? state.selectedCountryIds : ['US', 'IN', 'GB'],
                      }),
                  };
              });
              setGameStatus('PLAYING');
              setPhoneLaunch({ app: 'OWN_PLATFORM', pane: empire === 'build' || empire === 'legacy' ? 'build' : empire === 'ops' ? 'ops' : 'launch' });
              setActivePage(Page.MOBILE);
          }
      }
      return () => {
          window.removeEventListener('ae-open-production', onOpen);
          delete (window as Window & { __aeCommissions?: unknown }).__aeCommissions;
      };
  }, []);

  const marketingPreview = import.meta.env.DEV && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('marketing')
      : null;
  if (marketingPreview) {
      return <MarketingPreview mode={marketingPreview} />;
  }

  const scriptDeskPreview = import.meta.env.DEV && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('scriptdesk')
      : null;
  if (scriptDeskPreview) {
      return <ScriptDeskPreview mode={scriptDeskPreview} />;
  }

  if (isInitializing) {
      return (
          <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
              <Loader2 size={48} className="animate-spin text-amber-500 mb-4" />
              <div className="text-sm font-bold uppercase tracking-widest text-zinc-500">Loading Career...</div>
          </div>
      );
  }

  if (gameStatus === 'DEATH_SCREEN') {
      return (
          <DeathScreen 
              player={player} 
              onContinueAsChild={handleContinueAsChild} 
              onStartNewGame={handleRestartCareer} 
          />
      );
  }

  if (deathScreenPreviewPlayer) {
      return (
          <DeathScreen
              player={deathScreenPreviewPlayer}
              onContinueAsChild={() => setDeathScreenPreviewPlayer(null)}
              onStartNewGame={() => setDeathScreenPreviewPlayer(null)}
              isPreview
              onClosePreview={() => setDeathScreenPreviewPlayer(null)}
          />
      );
  }

  return (
    <GameErrorBoundary onRecover={handleRecoverToMenu}>
    <div className="h-screen bg-black text-white font-sans selection:bg-amber-500 selection:text-black">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950 pointer-events-none" />
      
      {/* SIMULATED AD OVERLAY */}
      {isShowingAd && (
          <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="text-center space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
                      <PlayCircle className="absolute inset-0 m-auto text-white" size={32} />
                  </div>
                  <div>
                      <h2 className="text-xl font-bold text-white uppercase tracking-widest">
                          Ad {adTotalSteps > 1 ? `${adStep}/${adTotalSteps}` : ''} Loading...
                      </h2>
                      <p className="text-zinc-500 text-xs">Please wait for reward confirmation</p>
                  </div>
              </div>
          </div>
      )}

      {/* DEBT / GAME OVER MODAL */}
      {showDebtModal && (
          <div className="fixed inset-0 z-[250] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
              <div className="bg-zinc-900 border-2 border-red-500/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center relative overflow-hidden">
                  
                  {/* Visuals */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                      {(player.flags.weeksInDebt || 0) >= 8 ? <Skull size={40} className="text-red-500" /> : <AlertTriangle size={40} className="text-red-500" />}
                  </div>
                  
                  {/* Status Check */}
                  {(player.flags.weeksInDebt || 0) >= 8 ? (
                      // GAME OVER STATE
                      <>
                          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Financial Ruin</h2>
                          <p className="text-red-400 text-sm mb-6 leading-relaxed font-bold">
                              You failed to recover from debt. Your assets have been seized and your reputation is destroyed.
                          </p>
                          <div className="bg-black/60 rounded-xl p-4 mb-6 border border-red-900">
                              <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Final Debt</div>
                              <div className="text-2xl font-mono font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</div>
                          </div>
                          <button 
                              onClick={handleRestartCareer}
                              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg"
                          >
                              Restart Career
                          </button>
                      </>
                  ) : (
                      // WARNING STATE
                      <>
                          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Bankruptcy Warning</h2>
                          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                              You are in debt! You have <span className="text-white font-bold">{8 - (player.flags.weeksInDebt || 0)} weeks</span> to recover funds before your career ends.
                          </p>
                          
                          <div className="bg-black/40 rounded-xl p-4 mb-6 border border-zinc-800">
                              <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-bold mb-2">
                                  <span>Current Debt</span>
                                  <span>Runway</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-xl font-mono font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</span>
                                  <span className="text-white font-bold">{8 - (player.flags.weeksInDebt || 0)} Weeks</span>
                              </div>
                          </div>

                          <div className="space-y-3">
                              {/* Bailout Option - Calculates ~20% of current debt + 5k */}
                              <button 
                                  onClick={() => handleTriggerRewardAd('REWARDED_BAILOUT')}
                                  disabled={(player.flags.bailoutAdsUsedThisWeek || 0) >= 2}
                                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                              >
                                  <PlayCircle size={18}/> Get Bailout (+${(((player.flags.bailoutAdsUsedThisWeek || 0) === 0 ? Math.floor(Math.abs(player.money) * 0.20) + 5000 : Math.floor(Math.abs(player.money) * 0.10) + 2500)).toLocaleString()})
                              </button>
                              <div className="text-[11px] text-zinc-500">
                                  Bailout ads used this week: {player.flags.bailoutAdsUsedThisWeek || 0}/2
                              </div>
                              
                              {/* Continue Option */}
                              <button 
                                  onClick={() => setShowDebtModal(false)}
                                  className="w-full py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Briefcase size={16}/> Manage Finances
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 border border-zinc-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top fade-in duration-300 min-w-[300px]">
              <div className="bg-emerald-500 rounded-full p-1"><CheckCircle size={20} className="text-black" strokeWidth={3}/></div>
              <div><div className="font-bold text-sm">{toastMessage.title}</div><div className="text-xs text-zinc-400">{toastMessage.subtext}</div></div>
          </div>
      )}

      {player.pendingEvent && (player.pendingEvent.type === 'AWARD_CEREMONY' || player.pendingEvent.type === 'PREMIERE') && (<RedCarpetEvent key={player.pendingEvent.id} player={player} event={player.pendingEvent} onComplete={handleEventComplete} />)}
      {player.pendingEvent && player.pendingEvent.type === 'FESTIVAL_PREMIERE' && (
          <FestivalNightModal key={player.pendingEvent.id} player={player} event={player.pendingEvent} onComplete={handleEventComplete} onUpdate={(updater) => setPlayer(current => updater(current))} />
      )}
      {player.pendingEvents && player.pendingEvents.length > 0 && (player.pendingEvents[0].type === 'PRODUCTION_CRISIS' || player.pendingEvents[0].type === 'DIRECTOR_DECISION') && (
          <ProductionCrisisModal 
              key={player.pendingEvents[0].id}
              player={player} 
              event={player.pendingEvents[0]} 
              onChoice={(idx) => {
                  const currentEvent = player.pendingEvents![0];
                  const { updatedPlayer, log } = applyCrisisImpact(player, currentEvent, idx);
                  resolveQueuedEventSafely(player, updatedPlayer, currentEvent.id, log);
              }} 
          />
      )}

      {player.pendingEvents && player.pendingEvents.length > 0 && 
        (player.pendingEvents[0].type === 'LIFE_EVENT' || 
         player.pendingEvents[0].type === 'LEGAL_HEARING' || 
         player.pendingEvents[0].type === 'SCANDAL' || 
         player.pendingEvents[0].type === 'UNDERWORLD_OFFER') && (
          <LifeEventModal 
              key={player.pendingEvents[0].id}
              player={player}
              event={player.pendingEvents[0]}
              onChoice={(updatedPlayer, log) => {
                  const resolvedEventId = player.pendingEvents?.[0]?.id;
                  resolveQueuedEventSafely(player, updatedPlayer, resolvedEventId, log);
              }}
          />
      )}
      {activePressEvent && (<PressConferenceEvent player={player} projectName={activePressEvent.project.name} questions={activePressEvent.questions} onComplete={handlePressConferenceComplete} onClose={() => setActivePressEvent(null)} />)}

      {showProtectionPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4"><Heart size={24} fill="currentColor" /></div>
                  <h3 className="text-white font-bold text-lg mb-1">Intimacy with {showProtectionPrompt.partnerName}</h3>
                  <div className="grid grid-cols-1 gap-3 w-full mt-6">
                      <button onClick={() => { setShowProtectionPrompt(null); handleIntimacyChoice('PROTECTED', showProtectionPrompt.partnerId); }} className="py-4 px-4 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 flex items-center justify-between group">
                          <div className="text-left"><div className="font-bold text-white text-sm">Use Protection</div></div><CheckCircle size={18} className="text-emerald-500"/>
                      </button>
                      <button onClick={() => { setShowProtectionPrompt(null); handleIntimacyChoice('UNPROTECTED', showProtectionPrompt.partnerId); }} className="py-4 px-4 rounded-xl bg-zinc-800 border border-rose-900/30 hover:bg-rose-900/10 flex items-center justify-between group">
                          <div className="text-left"><div className="font-bold text-rose-400 text-sm">Unprotected</div></div><ShieldAlert size={18} className="text-rose-500"/>
                      </button>
                  </div>
                  <button onClick={() => setShowProtectionPrompt(null)} className="mt-4 text-xs text-zinc-500 hover:text-white underline">Cancel</button>
              </div>
          </div>
      )}

      {pendingBabyNaming && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-14 h-14 bg-amber-500/15 text-amber-400 rounded-full flex items-center justify-center mb-4">
                          <Baby size={28} />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-1">Name Your Baby</h3>
                      <p className="text-sm text-zinc-400">Choose your child&apos;s first name and family surname.</p>
                  </div>

                  <div className="space-y-5">
                      <div>
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">First Name</label>
                          <input
                              value={babyFirstNameInput}
                              onChange={(e) => setBabyFirstNameInput(e.target.value)}
                              placeholder={pendingBabyNaming.suggestedFirstName}
                              maxLength={18}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-amber-500/60"
                          />
                      </div>

                      <div>
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Last Name</label>
                          <div className="grid grid-cols-1 gap-2">
                              {getBabySurnameOptions(pendingBabyNaming.partnerName).map(option => (
                                  <button
                                      key={option.id}
                                      onClick={() => setBabySurnameChoice(option.value)}
                                      className={`p-3 rounded-2xl border text-left transition-colors ${
                                          babySurnameChoice === option.value
                                              ? 'bg-amber-500/10 border-amber-500/50 text-white'
                                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                                      }`}
                                  >
                                      <div className="font-bold text-sm">{option.label}</div>
                                      <div className="text-xs text-zinc-500 mt-0.5">{option.value}</div>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Full Name Preview</div>
                          <div className="text-lg font-bold text-white">
                              {`${babyFirstNameInput.trim() || pendingBabyNaming.suggestedFirstName} ${babySurnameChoice}`.trim()}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <button
                              onClick={handleAbandonBaby}
                              className="w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 border border-rose-500/30"
                          >
                              Walk Away
                          </button>
                          <button
                              onClick={handleConfirmBabyName}
                              disabled={!babyFirstNameInput.trim() || !babySurnameChoice}
                              className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all ${
                                  !babyFirstNameInput.trim() || !babySurnameChoice
                                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                              }`}
                          >
                              Welcome Baby
                          </button>
                      </div>
                      <p className="text-center text-[11px] text-zinc-500">
                          Walking away can trigger custody fallout, divorce, child support, alimony, scandal news, and dynasty damage.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {activeSocialEvent && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                  <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">{activeSocialEvent.event.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{activeSocialEvent.event.description}</p>
                  </div>
                  <div className="space-y-3">
                      {activeSocialEvent.event.options.map((opt, idx) => (
                          <button key={idx} onClick={() => handleSocialEventChoice(opt)} className="w-full p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left transition-colors group">
                              <div className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">{opt.label}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {showWhatsNewModal && gameStatus === 'PLAYING' && (
          <div className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md overflow-y-auto custom-scrollbar px-3 py-5 sm:p-6 animate-in fade-in duration-200">
              <div className="relative mx-auto flex max-h-[calc(100dvh-2.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-blue-400/30 bg-black shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-amber-300"></div>
                  <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-5 pb-4 sm:p-6">
                      <WhatsNewNotes />
                  </div>
                  <div className="shrink-0 border-t border-white/10 bg-black px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
                      <button
                          onClick={handleDismissWhatsNew}
                          className="min-h-12 w-full rounded-2xl bg-amber-300 py-4 font-bold text-black hover:bg-amber-200"
                      >
                          Continue
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Persistent Debt Warning Banner (When modal is closed but still in debt) */}
      {player.money < 0 && !showDebtModal && (gameStatus === 'PLAYING') && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-xs font-bold z-[60] flex justify-between px-4 items-center shadow-lg cursor-pointer" onClick={() => setShowDebtModal(true)}>
              <span>⚠️ DEBT: ${Math.abs(player.money).toLocaleString()}</span>
              <span>{8 - (player.flags.weeksInDebt || 0)} Weeks Left</span>
          </div>
      )}

      <div className={`ae-shell w-full h-dvh relative z-10 bg-zinc-950/80 flex flex-col pt-safe-top ${!isBottomNavVisible ? 'ae-nav-hidden' : ''} ${player?.settings?.smoothMode ? 'smooth-mode' : ''}`}>
        {gameStatus === 'PLAYING' && <SideNav activePage={activePage} setPage={openPage} />}
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${gameStatus === 'PLAYING' ? 'lg:pl-[248px]' : ''}`}>
        {gameStatus === 'PLAYING' && (
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 lg:px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <IndustryGlobeMark size={36} />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">{player.name}</div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Industry Globe · Age {player.age} · Week {player.currentWeek}</div>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-2">
                    <button onClick={() => openPhone({ app: 'BANK' })} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-300">{formatMoney(player.money)}</button>
                    <button onClick={() => { armPlatformIdent(player); openPhone({ app: 'OWN_PLATFORM', pane: player.ownPlatform?.stage === 'LIVE' ? 'ops' : 'launch' }); }} className="rounded-full border border-[#ff3b30]/40 bg-[#ff3b30]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#ffb4b0]">{player.ownPlatform?.name || 'Empire+'}</button>
                    <button onClick={() => openPage(Page.STORE)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300">Store</button>
                    <button onClick={() => openPage(Page.SETTINGS)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300">Settings</button>
                </div>
            </div>
        )}
        {gameStatus === 'START_MENU' && (
            <StartMenu 
                saveSlots={saveSlots}
                onSelectSlot={handleSelectSlot}
                onDeleteSlot={handleDeleteSlot}
            />
        )}
        {gameStatus === 'CREATION' && <CreationMenu onStartGame={handleStartGame} onCancel={() => setGameStatus('START_MENU')} />}
        {gameStatus === 'PLAYING' && (
            <GameNavProvider value={{ openPage, openPhone, openLifestyle }}>
                <div className={`ae-scroll mx-auto w-full max-w-[1280px] min-h-0 flex-1 px-4 sm:px-5 lg:px-8 pt-4 pb-nav-safe overflow-y-auto custom-scrollbar ${player.money < 0 ? 'pt-8' : ''}`}>
                    {activePage === Page.HOME && (<HomePage player={player} onNextWeek={handleNextWeek} isProcessing={isProcessing} onUpdatePlayer={handleUpdatePlayer} setPage={openPage} onOpenProductionHouseCheat={() => openLifestyle('PRODUCTION_GAME')} onQueueBabyNamingCheat={handleQueueBabyNamingCheat} onOpenDeathSummaryPreview={handleOpenDeathSummaryPreview} onShowWhatsNewCheat={handleShowWhatsNewCheat} />)}
                    {activePage === Page.CAREER && (<CareerPage player={player} onQuitJob={handleQuitJob} onRehearse={handleRehearse} />)}
                    {activePage === Page.IMPROVE && (<ImprovePage player={player} onTrain={()=>{}} onSpendEarned={handleSpendEarned} onSpendPremium={handleSpendPremium} onEnroll={(c)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, money: p.money- (c.upfrontCost||0), commitments: [...p.commitments, {...c, id: `c_${Date.now()}`, weeksCompleted:0}] }; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onCancel={(id)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, commitments: p.commitments.filter(c=>c.id!==id)}; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onPerformAction={handleImproveAction} />)}
                    {activePage === Page.SOCIAL && (<SocialPage player={player} onInteract={handleSocialInteract} onContinueAsChild={handleContinueAsChild} />)}
                    {activePage === Page.LIFESTYLE && (<LifestylePage player={player} onBuyItem={handleBuyLifestyleItem} onSellItem={handleSellLifestyleItem} onSetResidence={(id)=>handleGenericUpdate(p=>({ ...p, residenceId: id }))} onSetActiveStyle={(s)=>handleGenericUpdate(p=>({ ...p, activeClothingStyle: s }))} onStartBusiness={()=>{}} onShutdownBusiness={()=>{}} onUpdatePlayer={handleUpdatePlayer} onPremiumPurchase={handlePremiumPurchase} onNavVisibilityChange={setIsBottomNavVisible} initialView={lifestyleInitialView ?? undefined} onInitialViewConsumed={() => setLifestyleInitialView(null)} />)}
                    {activePage === Page.MOBILE && (
                        <MobilePage 
                            player={player} 
                            onUpdatePlayer={handleUpdatePlayer}
                            onTriggerBabyNaming={handleSchedulePregnancy}
                            onAudition={(opp)=>handleGenericUpdate(p=>{ const next: Player = { ...p, applications: [...p.applications, { id: `app_${Date.now()}`, type: 'AUDITION' as const, name: opp.projectName, weeksRemaining: 1, data: opp }] }; spendPlayerEnergy(next, 25); return next; })}
                            onTakeJob={(job)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, commitments: [...p.commitments, job] }; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })}
                            onQuitJob={handleQuitJob} 
                            onPost={(t,c,img)=>handleGenericUpdate(p=>{
                                if (p.instagram.lastPostWeek !== p.currentWeek) {
                                    p.instagram.weeklyPostCount = 0;
                                    p.instagram.lastPostWeek = p.currentWeek;
                                }

                                if (p.instagram.weeklyPostCount >= 3) {
                                    setToastMessage({ title: "Too Many Posts", subtext: "Posting more will feel spammy. Try again next week." });
                                    return p;
                                }

                                const config = INSTAGRAM_POST_CONFIGS[t];
                                if (p.energy.current < config.energy) {
                                    setToastMessage({ title: "Not Enough Energy", subtext: `You need ${config.energy} energy to post this.` });
                                    return p;
                                }

                                const outcome = calculateInstagramPostOutcome(p, t, p.instagram.weeklyPostCount);
                                const actualGain = outcome.followerGain;
                                const avatarToSave = p.avatar.startsWith('data:') ? '' : p.avatar;

                                const newPost = {
                                    id: `p_${Date.now()}`,
                                    authorId: 'PLAYER',
                                    authorName: p.name,
                                    authorHandle: p.instagram.handle,
                                    authorAvatar: avatarToSave,
                                    type: t,
                                    caption: c,
                                    week: p.currentWeek,
                                    year: p.age,
                                    likes: outcome.likes,
                                    comments: outcome.comments,
                                    shares: outcome.shares,
                                    saves: outcome.saves,
                                    commentList: outcome.commentList,
                                    engagementScore: outcome.engagementScore,
                                    isPlayer: true,
                                    contentMediaId: img
                                };
                                
                                const toastMsg = outcome.likes > 10000 ? `Viral! +${actualGain.toLocaleString()} Followers` : `+${actualGain.toLocaleString()} Followers`;
                                setToastMessage({ title: "Posted", subtext: toastMsg });
                                
                                const nextState: Player = { 
                                    ...p, 
                                    stats: { ...p.stats, followers: p.stats.followers + actualGain },
                                    instagram: {
                                        ...p.instagram,
                                        followers: Math.max(p.instagram.followers || 0, p.stats.followers) + actualGain,
                                        posts: [newPost, ...p.instagram.posts],
                                        weeklyPostCount: p.instagram.weeklyPostCount + 1,
                                        aesthetic: clampInstagramStat((p.instagram.aesthetic ?? 50) + outcome.statDeltas.aesthetic),
                                        authenticity: clampInstagramStat((p.instagram.authenticity ?? 55) + outcome.statDeltas.authenticity),
                                        controversy: clampInstagramStat((p.instagram.controversy ?? 0) + outcome.statDeltas.controversy),
                                        fashionInfluence: clampInstagramStat((p.instagram.fashionInfluence ?? 10) + outcome.statDeltas.fashionInfluence),
                                        fanLoyalty: clampInstagramStat((p.instagram.fanLoyalty ?? 45) + outcome.statDeltas.fanLoyalty)
                                    } 
                                };
                                spendPlayerEnergy(nextState, config.energy);
                                if (actualGain >= 5000) {
                                    return appendBuzz(appendNews(nextState, {
                                        id: `news_ig_${Date.now()}`,
                                        headline: `${p.name}'s post is moving`,
                                        subtext: `${actualGain.toLocaleString()} new followers. The same post is on the phone and in the news.`,
                                        category: 'YOU',
                                        impactLevel: actualGain > 10000 ? 'MEDIUM' : 'LOW',
                                    }), `${p.name} just posted. Followers are actually showing up.`);
                                }
                                return nextState;
                            })}
                            onReactInstagramPost={(postId, action)=>handleGenericUpdate(p=>{
                                const applyReaction = (post: any) => {
                                    if (post.id !== postId) return post;
                                    if (action === 'LIKE') {
                                        const wasLiked = !!post.hasLiked;
                                        return { ...post, hasLiked: !wasLiked, likes: Math.max(0, (post.likes || 0) + (wasLiked ? -1 : 1)) };
                                    }
                                    const wasSaved = !!post.hasSaved;
                                    return { ...post, hasSaved: !wasSaved, saves: Math.max(0, (post.saves || 0) + (wasSaved ? -1 : 1)) };
                                };
                                return {
                                    ...p,
                                    instagram: {
                                        ...p.instagram,
                                        posts: p.instagram.posts.map(applyReaction),
                                        feed: p.instagram.feed.map(applyReaction)
                                    }
                                };
                            })}
                            onRespondInstagramDM={(npc, actionId, accepted)=>handleGenericUpdate(p=>{
                                const state = p.instagram.npcStates[npc.id] || {
                                    npcId: npc.id,
                                    isFollowing: false,
                                    isFollowedBy: false,
                                    relationshipScore: 0,
                                    relationshipLevel: 'STRANGER',
                                    lastInteractionWeek: p.currentWeek,
                                    hasMet: false,
                                    chatHistory: []
                                };
                                let selectedAction: any = null;
                                const updatedChat = (state.chatHistory || []).map(message => {
                                    if (message.action?.id !== actionId) return message;
                                    selectedAction = message.action;
                                    return {
                                        ...message,
                                        action: { ...message.action, status: accepted ? 'ACCEPTED' as const : 'DECLINED' as const }
                                    };
                                });

                                const replyText = accepted
                                    ? (selectedAction?.kind === 'IG_REFERRAL'
                                        ? "That means a lot. Keep the door open and I will take it seriously."
                                        : selectedAction?.kind === 'IG_BRAND_OFFER'
                                            ? "Sounds good. I will check the brief and handle it through my team."
                                            : "I hear you. Let's not make this messier than it needs to be.")
                                    : (selectedAction?.kind === 'IG_REFERRAL'
                                        ? "I appreciate you thinking of me, but I can't chase this one right now."
                                        : selectedAction?.kind === 'IG_BRAND_OFFER'
                                            ? "Thanks for reaching out, but I'll pass on this campaign."
                                            : "I'm not engaging with that. Wishing you well.");

                                const npcReplyText = accepted
                                    ? (selectedAction?.kind === 'IG_BRAND_OFFER'
                                        ? "Perfect. Check your Team app, the contract is active there."
                                        : selectedAction?.kind === 'IG_REFERRAL'
                                            ? "Good. I will keep the door warm and let the right people know."
                                            : "Got it. I'll keep you posted.")
                                    : "Understood. No hard feelings.";

                                const finalChat = [
                                    ...updatedChat,
                                    { sender: 'PLAYER' as const, text: replyText, timestamp: Date.now() },
                                    { sender: 'NPC' as const, text: npcReplyText, timestamp: Date.now() + 1 }
                                ];

                                const nextPlayer: Player = {
                                    ...p,
                                    instagram: {
                                        ...p.instagram,
                                        npcStates: {
                                            ...p.instagram.npcStates,
                                            [npc.id]: {
                                                ...state,
                                                chatHistory: finalChat,
                                                relationshipScore: Math.max(0, Math.min(100, state.relationshipScore + (accepted ? 3 : -1)))
                                            }
                                        }
                                    }
                                };

                                if (accepted && selectedAction?.kind === 'IG_REFERRAL') {
                                    const referrals = Array.isArray(nextPlayer.flags.pendingInstagramReferrals) ? nextPlayer.flags.pendingInstagramReferrals : [];
                                    const weeksLeft = Math.max(1, Math.round(selectedAction.payload?.weeksLeft || 2 + Math.floor(Math.random() * 2)));
                                    nextPlayer.flags.pendingInstagramReferrals = [
                                        ...referrals,
                                        { npcId: npc.id, npcName: npc.name, weeksLeft }
                                    ];
                                    nextPlayer.logs = [{ week: p.currentWeek, year: p.age, message: `📱 Instagram Referral Accepted: ${npc.name} may trigger a casting message in ${weeksLeft}-${weeksLeft + 1} weeks.`, type: 'positive' as const }, ...nextPlayer.logs].slice(0, 50);
                                    setToastMessage({ title: 'DM Accepted', subtext: `Casting may reach out in ${weeksLeft}-${weeksLeft + 1} weeks.` });
                                } else if (accepted && selectedAction?.kind === 'IG_BRAND_OFFER' && selectedAction.payload?.offer) {
                                    nextPlayer.activeSponsorships = [...nextPlayer.activeSponsorships, selectedAction.payload.offer];
                                    nextPlayer.logs = [{ week: p.currentWeek, year: p.age, message: `📱 Instagram Brand Deal: ${selectedAction.payload.offer.brandName} contract moved to your Team app.`, type: 'positive' as const }, ...nextPlayer.logs].slice(0, 50);
                                    setToastMessage({ title: 'Brand Deal Accepted', subtext: 'Check Team app to complete the contract.' });
                                } else {
                                    nextPlayer.logs = [{ week: p.currentWeek, year: p.age, message: accepted ? `📱 Instagram DM Accepted: You replied to ${npc.name}.` : `📵 Instagram DM Declined: You passed on ${npc.name}'s message.`, type: (accepted ? 'positive' : 'neutral') as 'positive' | 'neutral' }, ...nextPlayer.logs].slice(0, 50);
                                    setToastMessage({ title: accepted ? 'DM Accepted' : 'DM Declined', subtext: `${npc.name} saw your reply.` });
                                }

                                return nextPlayer;
                            })}
                            onFollowNPC={(npc)=>handleGenericUpdate(p=>({ ...p, instagram: { ...p.instagram, npcStates: { ...p.instagram.npcStates, [npc.id]: { ...p.instagram.npcStates[npc.id], isFollowing: !p.instagram.npcStates[npc.id]?.isFollowing } } } }))}
                            onInteractNPC={handleNPCInteract}
                            onBefriendNPC={(npc) => handleNPCInteract(npc, 'BEFRIEND')}
                            launchApp={phoneLaunch}
                            onLaunchConsumed={() => setPhoneLaunch(null)}
                            onHireAgent={(agent) => {
                                handleGenericUpdate(p => {
                                    if (p.money < agent.annualFee) {
                                        setToastMessage({ title: "Not Enough Money", subtext: `You need $${agent.annualFee.toLocaleString()} for the annual fee.` });
                                        return p;
                                    }
                                    const newRels = [...p.relationships];
                                    if (!newRels.some(r => r.npcId === agent.id)) {
                                        newRels.push({
                                            id: `rel_${agent.id}_${Date.now()}`,
                                            name: agent.name,
                                            relation: 'Agent',
                                            closeness: 50,
                                            image: `https://api.dicebear.com/8.x/avataaars/svg?seed=${agent.name}`,
                                            lastInteractionWeek: p.currentWeek,
                                            npcId: agent.id
                                        });
                                    }
                                    setToastMessage({ title: "Agent Hired!", subtext: `${agent.name} is now representing you.` });
                                    return { 
                                        ...p, 
                                        money: p.money - agent.annualFee,
                                        team: { 
                                            ...p.team,
                                            agent: agent,
                                            availableAgents: (p.team.availableAgents || []).filter(a => a.id !== agent.id)
                                        },
                                        relationships: newRels
                                    };
                                });
                            }}
                            onFireAgent={() => {
                                handleGenericUpdate(p => {
                                    const agentId = p.team.agent?.id;
                                    return { 
                                        ...p, 
                                        team: { ...p.team, agent: null },
                                        relationships: p.relationships.filter(r => r.npcId !== agentId)
                                    };
                                });
                            }}
                            onHireManager={(manager) => {
                                handleGenericUpdate(p => {
                                    if (p.money < manager.annualFee) {
                                        setToastMessage({ title: "Not Enough Money", subtext: `You need $${manager.annualFee.toLocaleString()} for the annual fee.` });
                                        return p;
                                    }
                                    const newRels = [...p.relationships];
                                    if (!newRels.some(r => r.npcId === manager.id)) {
                                        newRels.push({
                                            id: `rel_${manager.id}_${Date.now()}`,
                                            name: manager.name,
                                            relation: 'Manager',
                                            closeness: 50,
                                            image: `https://api.dicebear.com/8.x/avataaars/svg?seed=${manager.name}`,
                                            lastInteractionWeek: p.currentWeek,
                                            npcId: manager.id
                                        });
                                    }
                                    setToastMessage({ title: "Manager Hired!", subtext: `${manager.name} is now managing your career.` });
                                    return { 
                                        ...p, 
                                        money: p.money - manager.annualFee,
                                        team: {
                                            ...p.team,
                                            manager: manager,
                                            availableManagers: (p.team.availableManagers || []).filter(m => m.id !== manager.id)
                                        },
                                        relationships: newRels
                                    };
                                });
                            }}
                            onFireManager={() => {
                                handleGenericUpdate(p => {
                                    const managerId = p.team.manager?.id;
                                    return { 
                                        ...p, 
                                        team: { ...p.team, manager: null },
                                        relationships: p.relationships.filter(r => r.npcId !== managerId)
                                    };
                                });
                            }}
                            onAcceptMessage={(msg)=>handleGenericUpdate(p=>({ ...p, inbox: p.inbox.filter(m=>m.id!==msg.id) }))} 
                            onPerformSponsorship={(id, type)=>handleGenericUpdate(p=>{ const s = p.activeSponsorships.find(x=>x.id===id); if (!s) return p; const next = { ...p }; spendPlayerEnergy(next, s.requirements.energyCost); return next; })}
                            onDeleteMessage={(id)=>handleGenericUpdate(p=>({ ...p, inbox: p.inbox.filter(m=>m.id!==id) }))} 
                            onTradeStock={handleTradeStock}
                            onFoundCompany={handleFoundCompany}
                            onAcquirePlatform={handleAcquirePlatform} 
                        />
                    )}
                    {activePage === Page.SETTINGS && (
                        <SettingsPage 
                            player={player}
                            onUpdatePlayer={handleGenericUpdate}
                            onBack={() => openPage(Page.HOME)} 
                            onMainMenu={() => {
                                setGameStatus('START_MENU');
                                setActivePage(Page.HOME);
                            }}
                            onOpenStore={() => openPage(Page.STORE)}
                            onCreateCharacter={handleCreateCharacter}
                            onEditLook={handleEditLook}
                            onAddTalent={handleAddTalent}
                        />
                    )}
                    {activePage === Page.STORE && (
                        <StorePage 
                            player={player} 
                            onBack={() => openPage(Page.HOME)}
                            onWatchAd={handleTriggerRewardAd} 
                            onPremiumPurchase={handlePremiumPurchase}
                            onRestorePurchases={handleRestorePurchases}
                            onSkillPointPurchase={handleSkillPointPurchase}
                            onRestoreSkillPoints={handleRestoreSkillPoints}
                            onSyncWallet={(premiumBalance, characterUnlock) => handleGenericUpdate(prev => rememberPremiumSnapshot(prev, premiumBalance, characterUnlock))}
                        />
                    )}
                </div>
                {isBottomNavVisible && <BottomNav activePage={activePage} setPage={openPage} />}
            </GameNavProvider>
        )}
        </div>
      </div>
    </div>
    </GameErrorBoundary>
  );
};

export default App;
