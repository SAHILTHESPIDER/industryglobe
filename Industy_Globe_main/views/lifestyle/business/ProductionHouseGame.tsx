import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, BudgetTier, Genre, ProjectDetails, ActiveRelease, Commitment, Business, LocationDetails, NewsItem, XPost, StudioEquipment, Script, Writer, GameLanguage } from '../../../types';
import { ArrowLeft, Film, DollarSign, Users, TrendingUp, Calendar, Check, Plus, Star, Award, Zap, Briefcase, LayoutGrid, MapPin, PenTool, Globe, Camera, Clapperboard, ChevronRight, Lock, Building2, BarChart3, ShieldAlert, Crown, LogOut, AlertTriangle, Sparkles, BookOpen, Video, X, Clock, Palette, Lightbulb, Mic, Box, Tv, ArrowDownLeft, ArrowUpRight, WalletCards, Mail, Megaphone } from 'lucide-react';
import { NPC_DATABASE, getAvailableTalent, calculateProjectFameMultiplier } from '../../../services/npcLogic';
import { sellBusiness, liquidateBusiness } from '../../../services/businessLogic';
import { NPCActor, NPCTier } from '../../../types';
import { getDirectorTalent } from '../../../services/roleLogic';
import { getPlayerLanguage, t } from '../../../services/i18n';


import { DevelopmentLab } from './DevelopmentLab';
import { GreenlightWizard } from "./GreenlightWizard";
import { ReleaseWizard } from "./ReleaseWizard";

import { FacilitiesView } from './FacilitiesView';
import { StudioPage } from '../../StudioPage';
import { ProjectDashboardModal } from './components/ProjectDashboardModal';
import { SequelSetupModal } from './components/SequelSetupModal';
import { IPManagement } from './IPManagement';
import { RightsLibrary } from './RightsLibrary';
import { CommissionModal, CommissionSlateCards, CommissionToast, OffersPage, openBriefScreen } from './PlatformCommissions';
import { deskOf } from '../../../services/commissions/logic';
import { MarketingDesk } from '../../marketing/MarketingDesk';
import type { CommissionBrief, CommissionProject } from '../../../types';
import './productionDesk.css';

interface ProductionHouseGameProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    businessId?: string;
}

type StudioView = 'DASHBOARD' | 'DEVELOPMENT' | 'PRE_PROD' | 'PRODUCTION' | 'RELEASE' | 'RELEASES' | 'OFFICE' | 'FINANCE' | 'GREENLIGHT' | 'TALENT' | 'IP_MANAGEMENT' | 'FILMOGRAPHY' | 'RIGHTS' | 'OFFERS' | 'MARKETING';

// --- HELPERS ---
const formatMoney = (val: number) => {
    if (isNaN(val)) return '$0';
    if (val >= 1_000_000_000_000) return `$${(val/1_000_000_000_000).toFixed(1)}T`;
    if (val >= 1_000_000_000) return `$${(val/1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val/1_000).toFixed(0)}k`;
    return `$${val}`;
};


export const ProductionHouseGame: React.FC<ProductionHouseGameProps> = ({ player, onBack, onUpdatePlayer, businessId }) => {
    const studio = (businessId && player.businesses.find(b => b.id === businessId))
        || player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');

    if (!studio) return <div className="p-10 text-white">Error: Studio not found.</div>;

    return (
        <ProductionHouseInner
            key={studio.id}
            player={player}
            studio={studio}
            onBack={onBack}
            onUpdatePlayer={onUpdatePlayer}
        />
    );
};

const ProductionHouseInner: React.FC<{
    player: Player;
    studio: Business;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}> = ({ player, studio, onBack, onUpdatePlayer }) => {
    const [view, setView] = useState<StudioView>('DASHBOARD');
    const [marketingTitleId, setMarketingTitleId] = useState<string | undefined>(undefined);
    const [commissionFlow, setCommissionFlow] = useState<{ screen: 'sheet' | 'counter' | 'reply' | 'contract' | 'signed' | 'lost' | 'project'; briefId?: string; projectId?: string } | null>(null);
    const [snoozedOffers, setSnoozedOffers] = useState<string[]>([]);
    const openCommission = (brief: CommissionBrief) => setCommissionFlow({ screen: openBriefScreen(brief), briefId: brief.id });
    const openCommissionProject = (project: CommissionProject) => setCommissionFlow({ screen: 'project', projectId: project.id });
    const [selectedProjectDashboard, setSelectedProjectDashboard] = useState<any>(null);
    const [sequelSetupProject, setSequelSetupProject] = useState<{ project: any, isSpinoff: boolean } | null>(null);

    useEffect(() => {
        const id = player.flags?.openCommissionBriefId;
        if (!id) return;
        const brief = deskOf(player).briefs.find(row => row.id === id);
        if (brief) setCommissionFlow({ screen: openBriefScreen(brief), briefId: brief.id });
        onUpdatePlayer({ ...player, flags: { ...player.flags, openCommissionBriefId: undefined } });
    }, [player.flags?.openCommissionBriefId]);

    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    // --- DATA AGGREGATION ---
    
    // 1. In-Development (Commitments)
    const studioCommitments = player.commitments.filter(c => 
        c.projectDetails && c.projectDetails.studioId === studio.id
    );

    const developmentProjects = studioCommitments.filter(c => c.projectPhase === 'PLANNING');
    const preProdProjects = studioCommitments.filter(c => c.projectPhase === 'PRE_PRODUCTION' || c.projectPhase === 'AUDITION');
    const productionProjects = studioCommitments.filter(c => c.projectPhase === 'PRODUCTION');
    const postProjects = studioCommitments.filter(c => c.projectPhase === 'POST_PRODUCTION');
    const awaitingReleaseProjects = studioCommitments.filter(c => c.projectPhase === 'AWAITING_RELEASE');

    // 2. Releases (Active & Past)
    const activeReleases = player.activeReleases.filter(r => r.projectDetails.studioId === studio.id);
    const library = player.pastProjects.filter(p => p.studioId === studio.id);

    // Calculate Latest Installments for Sequel Button
    const latestInstallmentIds = useMemo(() => {
        const franchises: Record<string, any> = {};
        // Consider ALL past projects to find the absolute latest in a franchise
        player.pastProjects.forEach(p => {
            if (p.projectType !== 'MOVIE') return;
            const fId = p.franchiseId || p.id;
            if (!franchises[fId] || (p.installmentNumber || 1) > (franchises[fId].installmentNumber || 1)) {
                franchises[fId] = p;
            }
        });
        return new Set(Object.values(franchises).map(p => p.id));
    }, [player.pastProjects]);

    // Calculate Studio Metrics
    const totalGross = activeReleases.reduce((sum, r) => sum + r.totalGross + (r.streamingRevenue || 0), 0) + library.reduce((sum, p) => sum + (p.gross || 0) + (p.streamingRevenue || 0), 0);
    const avgRating = library.length > 0 ? library.reduce((sum, p) => sum + (p.rating || 0), 0) / library.length : 0;
    
    // Calculate Awards Won
    const awardsWon = library.reduce((sum, p) => sum + (p.awards?.filter(a => a.outcome === 'WON').length || 0), 0);
    
    const breakoutCount = library.filter(p => ((p.gross || 0) + (p.streamingRevenue || 0)) > 200_000_000).length;
    const consistencyBonus = library.filter(p => (p.rating || 0) >= 7.5).length * 0.8;
    // Prestige Score (0-100): rewards quality, awards, consistency, and credible hits.
    const prestigeScore = Math.min(100, Math.floor((avgRating * 6) + (awardsWon * 2.5) + (library.length * 0.8) + (breakoutCount * 1.2) + consistencyBonus));

    // Active Slate List (Combined for the Netflix-style row)
    const activeSlate = [
        ...(studio.studioState?.concepts?.map(c => {
            const script = studio.studioState?.scripts.find(s => s.id === c.scriptId);
            const isScripting = script?.status === 'IN_DEVELOPMENT';
            return {
                id: c.id,
                name: script ? script.title : 'Untitled Concept',
                type: script?.type || 'MOVIE',
                phase: isScripting ? 'DEVELOPMENT' : 'CONCEPT',
                risk: 'LOW',
                budget: 0,
                concept: c // Pass full concept for loading
            };
        }) || []),
        ...(studio.studioState?.scripts.filter(s => s.status === 'IN_DEVELOPMENT' && !studio.studioState?.concepts?.some(c => c.scriptId === s.id)).map(s => ({ 
            id: s.id, 
            name: s.name || s.title, 
            type: s.type,
            phase: 'DEVELOPMENT', 
            risk: 'LOW',
            budget: 0, // Not yet budgeted
            customPoster: s.customPoster,
            concept: undefined as undefined
        })) || []),
        ...developmentProjects.map(p => ({ ...p, phase: 'PLANNING', risk: 'LOW' })),
        ...preProdProjects.map(p => ({ ...p, phase: 'PRE-PRODUCTION', risk: 'LOW' })),
        ...productionProjects.map(p => ({ ...p, phase: 'PRODUCTION', risk: 'HIGH' })),
        ...postProjects.map(p => ({ ...p, phase: 'POST-PRODUCTION', risk: 'MEDIUM' })),
        ...awaitingReleaseProjects.map(p => ({ 
            ...p, 
            phase: p.projectDetails?.releaseStrategy ? 'PLANNED RELEASE' : 'AWAITING RELEASE', 
            risk: 'LOW' 
        }))
    ];

    const pastProjectsSlate = [
        ...activeReleases.map(r => ({
            id: r.id,
            name: r.name,
            phase: r.distributionPhase === 'STREAMING' ? 'STREAMING' : r.distributionPhase === 'STREAMING_BIDDING' ? 'BIDDING' : 'IN THEATERS',
            rating: r.imdbRating,
            gross: r.totalGross,
            budget: r.budget,
            type: r.type,
            awards: [],
            views: r.streaming?.totalViews,
            streamingRevenue: r.streamingRevenue,
            projectDetails: r.projectDetails,
            bids: r.bids
        })),
        ...library.map(p => ({
            id: p.id,
            name: p.name,
            phase: 'RELEASED',
            rating: p.rating,
            gross: p.gross,
            budget: p.budget,
            type: p.type,
            awards: p.awards,
            views: p.totalViews,
            streamingRevenue: p.streamingRevenue,
            customPoster: p.customPoster
        }))
    ];
    const sortedPastProjectsSlate = [...pastProjectsSlate].sort(sortStudioArchiveByRecent);
    const recentPastProjectsPreview = sortedPastProjectsSlate.slice(0, 8);

    // --- RENDER HELPERS ---
    
    const handleDeleteConcept = (conceptId: string) => {
        const updatedStudio = { ...studio };
        if (updatedStudio.studioState && updatedStudio.studioState.concepts) {
            updatedStudio.studioState.concepts = updatedStudio.studioState.concepts.filter(c => c.id !== conceptId);
            
            // Update player
            const updatedPlayer = { ...player };
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
            onUpdatePlayer(updatedPlayer);
        }
    };

    const handleStartStreamingBidding = (project: any) => {
        const updatedPlayer = { ...player };
        
        // Check if it's already an active release (e.g. already in BIDDING phase)
        const activeIndex = player.activeReleases?.findIndex(r => r.id === project.id);
        if (activeIndex !== undefined && activeIndex !== -1 && updatedPlayer.activeReleases) {
            setSelectedProjectDashboard(updatedPlayer.activeReleases[activeIndex]);
            setView('RELEASE');
            return;
        }

        // Find project in library (pastProjects)
        const libraryIndex = player.pastProjects.findIndex(p => p.id === project.id);
        if (libraryIndex !== -1) {
            const pastProject = player.pastProjects[libraryIndex];
            
            // Move to activeReleases with BIDDING phase
            const newActiveRelease: ActiveRelease = {
                id: pastProject.id,
                name: pastProject.name,
                type: pastProject.projectType || 'MOVIE',
                roleType: pastProject.roleType || 'LEAD',
                weekNum: 0,
                weeklyGross: [],
                status: 'FINISHED',
                productionPerformance: pastProject.projectQuality || 70,
                budget: pastProject.budget,
                totalGross: pastProject.gross || 0,
                distributionPhase: 'STREAMING_BIDDING',
                weeksInTheaters: (pastProject as any).weeksInTheaters || 0,
                imdbRating: pastProject.imdbRating || 50,
                projectDetails: (pastProject as any).projectDetails || {
                    title: pastProject.name,
                    type: pastProject.projectType || 'MOVIE',
                    description: pastProject.description || '',
                    studioId: studio.id,
                    subtype: pastProject.subtype || 'STANDALONE',
                    genre: pastProject.genre || (pastProject as any).projectDetails?.genre || 'ACTION',
                    budgetTier: 'MID',
                    estimatedBudget: pastProject.budget,
                    visibleHype: 'MID',
                    hiddenStats: {
                        scriptQuality: pastProject.projectQuality || 50,
                        directorQuality: 50,
                        castingStrength: 50,
                        distributionPower: 50,
                        rawHype: 50,
                        qualityScore: pastProject.projectQuality || 50,
                        prestigeBonus: 0
                    },
                    directorName: 'Unknown',
                    visibleDirectorTier: 'Professional',
                    visibleScriptBuzz: 'Good',
                    visibleCastStrength: 'Strong'
                }
            };

            updatedPlayer.activeReleases = [...updatedPlayer.activeReleases, newActiveRelease];
            updatedPlayer.pastProjects = updatedPlayer.pastProjects.filter(p => p.id !== project.id);
            
            // Remove the project from any legacy in-studio library list if present.
            const updatedStudio = { ...studio } as any;
            if (Array.isArray(updatedStudio.library)) {
                updatedStudio.library = updatedStudio.library.filter((p: any) => p.id !== project.id);
            }
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);

            onUpdatePlayer(updatedPlayer);
            setSelectedProjectDashboard(newActiveRelease);
            setView('RELEASE');
        }
    };

    const handleMakeSequel = (project: any) => {
        setSequelSetupProject({ project, isSpinoff: false });
    };

    const handleMakeSpinoff = (project: any) => {
        setSequelSetupProject({ project, isSpinoff: true });
    };

    const handleStartWritingSequel = (writer: Writer | null, title: string, isSpinoff: boolean) => {
        if (!sequelSetupProject) return;
        const project = sequelSetupProject.project;
        const updatedStudio = { ...studio };
        if (!updatedStudio.studioState) return;
        const isInternallyControlledTalent = (id: string) => id === 'PLAYER_SELF' || id === 'STUDIO_STAFF';

        // Deduct writer fee
        if (writer) {
            updatedStudio.balance -= writer.fee;
        }

        // Generate a new script based on the past project
        const newScriptId = `script-${Date.now()}`;
        
        // Calculate returning talent demands
        const details = project.projectDetails || project;
        const returningTalent: any[] = [];
        
        if (details.directorId) {
            const dirSalary = details.crewList?.find((c: any) => c.role === 'DIRECTOR')?.salary || project.budget * 0.05;
            returningTalent.push({
                role: 'DIRECTOR',
                id: details.directorId,
                originalSalary: dirSalary,
                newDemand: dirSalary * 1.2, // 20% bump
                negotiated: isInternallyControlledTalent(details.directorId),
                accepted: isInternallyControlledTalent(details.directorId),
                attemptsLeft: isInternallyControlledTalent(details.directorId) ? 0 : 3
            });
        }

        if (details.crewList) {
            details.crewList.forEach((crewMember: any) => {
                if (!crewMember?.id || crewMember.role === 'DIRECTOR') return;
                if (!['CINEMATOGRAPHER', 'COMPOSER', 'LINE_PRODUCER', 'VFX_SUPERVISOR'].includes(crewMember.role)) return;

                const originalSalary = crewMember.salary || project.budget * 0.02;
                returningTalent.push({
                    role: crewMember.role,
                    id: crewMember.id,
                    originalSalary,
                    newDemand: originalSalary * 1.18,
                    negotiated: isInternallyControlledTalent(crewMember.id),
                    accepted: isInternallyControlledTalent(crewMember.id),
                    attemptsLeft: isInternallyControlledTalent(crewMember.id) ? 0 : 3
                });
            });
        }
        
        const sourceCastList = details.castList;
        if (sourceCastList) {
            sourceCastList.forEach((c: any) => {
                if (c.actorId && c.actorId !== 'UNKNOWN') {
                    const originalSalary = c.salary || project.budget * (c.roleType === 'LEAD' ? 0.08 : 0.03);
                    returningTalent.push({
                        role: c.roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR',
                        id: c.actorId,
                        originalSalary: originalSalary,
                        newDemand: originalSalary * 1.2, // 20% bump
                        negotiated: isInternallyControlledTalent(c.actorId),
                        accepted: isInternallyControlledTalent(c.actorId),
                        attemptsLeft: isInternallyControlledTalent(c.actorId) ? 0 : 3
                    });
                }
            });
        }

        const loglines = isSpinoff ? [
            `A thrilling new spin-off set in the universe of ${project.title}, exploring untold stories and new characters.`,
            `Expanding the world of ${project.title}, this spin-off takes the franchise in a bold and unexpected new direction.`,
            `Focusing on fan-favorite elements from ${project.title}, this new adventure stands on its own while honoring its roots.`
        ] : [
            `The highly anticipated next chapter in the epic saga of ${project.title}, raising the stakes higher than ever before.`,
            `Continuing the story of ${project.title}, our heroes face their greatest challenge yet in this explosive follow-up.`,
            `Building upon the events of ${project.title}, this sequel dives deeper into the lore and delivers shocking twists.`
        ];
        const randomLogline = loglines[Math.floor(Math.random() * loglines.length)];
        const sourceHiddenStats = details.hiddenStats || {};
        const sourceFundingAmount = sourceHiddenStats.nextSeasonFundingUsedByProjectId
            ? 0
            : Number(sourceHiddenStats.nextSeasonFundingAmount || 0);
        const sourceFundingPlatformId = sourceHiddenStats.nextSeasonFundingPlatformId || null;
        const lockedFundRecord = (studio.studioState?.lockedStreamingFunds || []).find((fund: any) =>
            fund.sourceProjectId === project.id || fund.sourceProjectId === details.id || fund.sourceProjectId === sourceHiddenStats.nextSeasonFundingSourceProjectId
        );
        const lockedStreamingFunding = !isSpinoff && (project.type || details.type) === 'SERIES' && (sourceFundingAmount > 0 || lockedFundRecord)
            ? {
                id: lockedFundRecord?.id || `stream_fund_${project.id}_${Date.now()}`,
                platformId: lockedFundRecord?.platformId || sourceFundingPlatformId || 'STREAMING_PLATFORM',
                platformName: lockedFundRecord?.platformName || sourceFundingPlatformId || 'Streaming Platform',
                amount: Math.floor(lockedFundRecord?.amount || sourceFundingAmount),
                sourceProjectId: lockedFundRecord?.sourceProjectId || project.id,
                sourceTitle: lockedFundRecord?.sourceTitle || project.title || project.name,
                franchiseId: project.franchiseId || project.id,
                installmentNumber: project.installmentNumber || 1,
                projectType: 'SERIES' as const,
                createdWeek: lockedFundRecord?.createdWeek || player.currentWeek,
                createdYear: lockedFundRecord?.createdYear || player.age
            }
            : undefined;

        const newScript: Script = {
            id: newScriptId,
            title: title,
            logline: randomLogline,
            projectType: isSpinoff ? (project.type === 'MOVIE' ? 'SERIES' : 'MOVIE') : (project.type || 'MOVIE'),
            targetAudience: project.projectDetails?.targetAudience || project.targetAudience || 'PG-13',
            genres: [project.genre || 'ACTION'],
            quality: writer ? writer.skill : 50,
            status: 'IN_DEVELOPMENT',
            writerId: writer ? writer.id : 'studio',
            author: writer ? writer.name : 'In-House Writers',
            weeksInDevelopment: 0,
            totalDevelopmentWeeks: writer ? Math.max(4, 20 - writer.speed) : 10,
            isOriginal: false,
            options: [],
            sourceMaterial: isSpinoff ? 'SPINOFF' : 'SEQUEL',
            franchiseId: project.franchiseId || project.id,
            installmentNumber: isSpinoff ? 1 : (project.installmentNumber || 1) + 1,
            returningTalent,
            lockedStreamingFunding
        };

        updatedStudio.studioState.scripts = [...(updatedStudio.studioState.scripts || []), newScript];

        // Create a ProjectConcept immediately for sequels so they appear in the Active Slate
        const newConcept: any = {
            id: `concept_${newScriptId}`,
            scriptId: newScriptId,
            lastUpdated: Date.now(),
            crewModes: {
                director: 'HIRE',
                cinematographer: 'HIRE',
                composer: 'HIRE',
                lineProducer: 'HIRE',
                vfx: 'HIRE'
            },
            selectedCrew: {
                director: null,
                cinematographer: null,
                composer: null,
                lineProducer: null,
                vfx: null
            },
            castList: [
                { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null },
                { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null }
            ],
            selectedLocations: [],
            equipmentChoices: {
                cameras: 'TIER_3',
                lighting: 'TIER_3',
                sound: 'TIER_3',
                practicalEffects: 'TIER_3'
            },
            tone: project.projectDetails?.tone || 50,
            lastStep: 'SELECT_SCRIPT',
            lockedStreamingFunding
        };

        // Pre-fill concept with previous project data
        // (details is already defined above)
        
        // Pre-fill director
        if (details.directorId) {
            newConcept.selectedCrew.director = details.directorId;
            newConcept.crewModes.director = details.directorId === 'PLAYER_SELF' ? 'SELF' : (details.directorId === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
        }

        // Pre-fill other crew
        if (details.crewList && details.crewList.length > 0) {
            details.crewList.forEach((c: any) => {
                const roleKey = c.role.toLowerCase();
                if (roleKey === 'cinematographer' || roleKey === 'composer' || roleKey === 'line_producer' || roleKey === 'vfx_supervisor') {
                    const stateKey = roleKey === 'line_producer' ? 'lineProducer' : (roleKey === 'vfx_supervisor' ? 'vfx' : roleKey);
                    newConcept.selectedCrew[stateKey] = c.id;
                    newConcept.crewModes[stateKey] = c.id === 'PLAYER_SELF' ? 'SELF' : (c.id === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                }
            });
        }

        // Pre-fill cast
        if (details.castList && details.castList.length > 0) {
            newConcept.castList = details.castList.map((c: any) => {
                let salary = c.salary || 0;
                const returning = returningTalent.find(t => t.id === c.actorId);
                if (returning) {
                    salary = returning.newDemand;
                }
                return {
                    id: c.roleId || c.id,
                    role: c.roleName || c.role,
                    roleType: c.roleType,
                    actorId: c.actorId === 'UNKNOWN' ? null : c.actorId,
                    actorName: c.name || c.actorName,
                    salary: salary,
                    characterId: c.characterId,
                    characterName: c.characterName,
                    sourceUniverseId: c.sourceUniverseId
                };
            });
        }

        // Pre-fill equipment
        if (details.equipmentChoices) {
            newConcept.equipmentChoices = { ...details.equipmentChoices };
        }

        // Pre-fill tone and style
        if (details.tone !== undefined) newConcept.tone = details.tone;
        if (details.visualStyle) newConcept.visualStyle = details.visualStyle;
        if (details.pacing) newConcept.pacing = details.pacing;

        if (!updatedStudio.studioState.concepts) updatedStudio.studioState.concepts = [];
        updatedStudio.studioState.concepts.push(newConcept);

        // Update player
        const updatedPlayer = { ...player };
        updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        onUpdatePlayer(updatedPlayer);
        
        // Close modals and open Development Lab
        setSequelSetupProject(null);
        setSelectedProjectDashboard(null);
        setView('DEVELOPMENT');
    };


    const [selectedConcept, setSelectedConcept] = useState<any>(null);

    const currentProject = React.useMemo(() => {
        if (!selectedProjectDashboard) return null;
        
        // Find in active releases
        const active = player.activeReleases?.find(r => r.id === selectedProjectDashboard.id);
        if (active) {
            return {
                ...active,
                phase: active.distributionPhase === 'STREAMING' ? 'STREAMING' : active.distributionPhase === 'STREAMING_BIDDING' ? 'BIDDING' : 'IN THEATERS'
            };
        }
        
        // Find in past projects
        const past = player.pastProjects?.find(p => p.id === selectedProjectDashboard.id);
        if (past) {
            return {
                ...past,
                phase: 'RELEASED'
            };
        }
        
        return selectedProjectDashboard;
    }, [selectedProjectDashboard, player]);

    if (view === 'MARKETING') {
        return (
            <MarketingDesk
                player={player}
                ownerKind="HOUSE"
                ownerId={studio.id}
                ownerName={studio.name}
                cash={studio.balance}
                initialTitleId={marketingTitleId}
                onPlayer={onUpdatePlayer}
                onBack={() => setView('DASHBOARD')}
            />
        );
    }

    if (view === 'FINANCE') {
        return <StudioFinanceView player={player} studio={studio} onBack={() => setView('DASHBOARD')} onUpdatePlayer={onUpdatePlayer} onExit={onBack} />;
    }

    if (view === 'DEVELOPMENT') {
        return <DevelopmentLab player={player} studio={studio} onBack={() => setView('DASHBOARD')} onUpdatePlayer={onUpdatePlayer} onOpenRights={() => setView('RIGHTS')} />;
    }

    if (view === 'RIGHTS') {
        return <RightsLibrary player={player} studio={studio} onBack={() => setView('DASHBOARD')} onUpdatePlayer={onUpdatePlayer} />;
    }

    if (view === 'OFFERS') {
        return (
            <>
                <OffersPage player={player} onBack={() => setView('DASHBOARD')} onOpen={openCommission} onOpenProject={openCommissionProject} />
                {commissionFlow && (
                    <CommissionModal player={player} flow={commissionFlow} onFlow={setCommissionFlow} onUpdatePlayer={onUpdatePlayer} onOpenLab={() => { setCommissionFlow(null); setView('DEVELOPMENT'); }} />
                )}
            </>
        );
    }

    if (view === 'OFFICE') {
        return <FacilitiesView player={player} studio={studio} onBack={() => setView('DASHBOARD')} onUpdatePlayer={onUpdatePlayer} />;
    }

    if (view === 'TALENT') {
        return <StudioPage player={player} businessId={studio.id} onUpdatePlayer={onUpdatePlayer} onBack={() => setView('DASHBOARD')} />;
    }

    if (view === 'IP_MANAGEMENT') {
        return <IPManagement player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} onBack={() => setView('DASHBOARD')} />;
    }

    if (view === 'RELEASE' && currentProject) {
        return (
            <ReleaseWizard 
                player={player} 
                studio={studio} 
                project={currentProject} 
                isPostTheatricalBidding={currentProject.distributionPhase === 'STREAMING_BIDDING' || currentProject.distributionPhase === 'THEATRICAL' || currentProject.phase === 'BIDDING' || currentProject.phase === 'RELEASED' || currentProject.phase === 'IN THEATERS'}
                onBack={() => { 
                    setView('DASHBOARD'); 
                }} 
                onUpdatePlayer={onUpdatePlayer} 
                onComplete={() => { 
                    setView('DASHBOARD'); 
                }} 
            />
        );
    }

    return (
        <AnimatePresence mode="wait">
            {currentProject && (
                <ProjectDashboardModal 
                    project={currentProject}
                    player={player}
                    studio={studio as any}
                    onClose={() => setSelectedProjectDashboard(null)}
                    onUpdatePlayer={onUpdatePlayer}
                    onMakeSequel={handleMakeSequel}
                    onMakeSpinoff={handleMakeSpinoff}
                    onStartStreamingBidding={handleStartStreamingBidding}
                    onConfigureRelease={(p) => {
                        setSelectedProjectDashboard(p);
                        setView('RELEASE');
                    }}
                    onMarket={(project) => {
                        setSelectedProjectDashboard(null);
                        setMarketingTitleId(project?.id);
                        setView('MARKETING');
                    }}
                />
            )}
            {sequelSetupProject && (
                <SequelSetupModal
                    project={sequelSetupProject.project}
                    player={player}
                    studio={studio}
                    isSpinoff={sequelSetupProject.isSpinoff}
                    onClose={() => setSequelSetupProject(null)}
                    onStartWriting={handleStartWritingSequel}
                />
            )}
            {view === 'GREENLIGHT' ? (
                <motion.div 
                    key="greenlight"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="fixed inset-0 z-[60]"
                >
                    <GreenlightWizard 
                        player={player} 
                        studio={studio} 
                        initialConcept={selectedConcept}
                        onBack={() => {
                            setSelectedConcept(null);
                            setView('DASHBOARD');
                        }} 
                        onUpdatePlayer={onUpdatePlayer} 
                        onComplete={() => {
                            setSelectedConcept(null);
                            setView('DASHBOARD');
                        }}
                    />
                </motion.div>
            ) : view === 'FILMOGRAPHY' ? (
                <motion.div
                    key="filmography"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.35 }}
                    className="fixed inset-0 z-[60]"
                >
                    <StudioFilmographyView
                        projects={sortedPastProjectsSlate as any[]}
                        studio={studio}
                        language={language}
                        onBack={() => setView('DASHBOARD')}
                        onOpenProject={(project) => setSelectedProjectDashboard(project)}
                    />
                </motion.div>
            ) : (
                <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="ph-shell"
                >
            <aside className="ph-identity">
                <button type="button" onClick={onBack} className="ph-back" aria-label="Back">
                    <ArrowLeft size={18} />
                </button>
                <div className="ph-brand">
                    <div className="ph-mark" aria-hidden="true">{studioInitials(studio.name)}</div>
                    <h1 className="ph-studio-name">{studio.name}</h1>
                    <span className="ph-tier">{studio.subtype === 'MAJOR_STUDIO' ? 'Major' : 'Indie'}</span>
                    <div className="ph-where">
                        <MapPin size={12} />
                        <span>{studio.subtype === 'MAJOR_STUDIO' ? 'Hollywood, CA' : 'Burbank, CA'}</span>
                    </div>
                </div>
                <div className="ph-money">
                    <div>
                        <div className="ph-kicker">Valuation</div>
                        <div className="ph-value ph-value-gold">{formatMoney(studio.stats.valuation)}</div>
                    </div>
                    <div>
                        <div className="ph-kicker">Capital</div>
                        <div data-testid="studio-capital" className="ph-value ph-value-blue">{formatMoney(studio.balance)}</div>
                        {(studio.studioState?.productionFund || 0) > 0 && (
                            <div className="ph-fund">+ {formatMoney(studio.studioState!.productionFund!)} Prod. Fund</div>
                        )}
                    </div>
                </div>
                <div className="ph-stats">
                    <div className="ph-stat"><span className="ph-stat-label"><Star size={14} /> Avg Rating</span><b>{avgRating > 0 ? avgRating.toFixed(1) : '--'}</b></div>
                    <div className="ph-stat"><span className="ph-stat-label"><Award size={14} /> Awards</span><b>{awardsWon}</b></div>
                    <div className="ph-stat"><span className="ph-stat-label"><Film size={14} /> Films</span><b>{library.length}</b></div>
                    <div className="ph-stat"><span className="ph-stat-label"><TrendingUp size={14} /> Lifetime B.O.</span><b>{formatMoney(totalGross)}</b></div>
                    <div className="ph-stat"><span className="ph-stat-label"><Crown size={14} /> Prestige</span><b>{prestigeScore}/100</b></div>
                </div>
            </aside>

            <div className="ph-main custom-scrollbar">
                <div className="ph-block">
                    <CommissionToast player={player} snoozed={snoozedOffers} onOpen={openCommission} onLater={id => setSnoozedOffers(current => [...current, id])} />
                    <div className="ph-section-head">
                        <h2>{tr('studio.activeSlate')}</h2>
                    </div>
                    <div className="ph-slate-row">
                        <button data-testid="open-greenlight" type="button" onClick={() => setView('GREENLIGHT')} className="ph-slate-new">
                            <span className="ph-slate-plus"><Plus size={22} /></span>
                            <span>{tr('studio.newProject')}</span>
                        </button>
                        <CommissionSlateCards player={player} onOpen={openCommissionProject} />
                        {(activeSlate as any[]).map((p, idx) => (
                            <ActiveProjectCard
                                key={p.id || idx}
                                project={p}
                                onClick={() => {
                                    if (p.phase === 'CONCEPT' || (p.phase === 'DEVELOPMENT' && p.concept)) {
                                        setSelectedConcept(p.concept);
                                        setView('GREENLIGHT');
                                    } else if (p.phase === 'AWAITING RELEASE') {
                                        const screeningStatus = p.projectDetails?.testScreening?.status;
                                        const screeningOpen = screeningStatus === 'OFFERED' || screeningStatus === 'RESULTS' || screeningStatus === 'WORKING';
                                        setSelectedProjectDashboard(p);
                                        if (!screeningOpen) setView('RELEASE');
                                    } else {
                                        setSelectedProjectDashboard(p);
                                    }
                                }}
                                onDelete={(p.phase === 'CONCEPT' || (p.phase === 'DEVELOPMENT' && p.concept)) ? () => handleDeleteConcept(p.id) : undefined}
                            />
                        ))}
                    </div>
                </div>

                {pastProjectsSlate.length > 0 && (
                    <div className="ph-block">
                        <div className="ph-section-head">
                            <h2>{tr('studio.pastProjects')}</h2>
                            <button type="button" onClick={() => setView('FILMOGRAPHY')} className="ph-link">
                                {tr('studio.seeMore')} <ChevronRight size={12} />
                            </button>
                        </div>
                        <div className="ph-slate-row">
                            {recentPastProjectsPreview.map(p => (
                                <ArchiveProjectCard
                                    key={p.id}
                                    project={p as any}
                                    isLatestInstallment={latestInstallmentIds.has(p.id)}
                                    onClick={() => {
                                        setSelectedProjectDashboard(p);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="ph-block" style={{ paddingBottom: 28 }}>
                    <div className="ph-section-head">
                        <h2>{tr('studio.corporateDivisions')}</h2>
                    </div>
                    <div className="ph-divisions">
                        <DivisionCard
                            featured
                            title={tr('studio.devLab')}
                            subtitle="Scripts & IP"
                            icon={<PenTool size={18}/>}
                            color="bg-blue-600"
                            stats={[{ label: "Scripts", value: String(studio.studioState?.scripts?.length || 0) }]}
                            onClick={() => setView('DEVELOPMENT')}
                        />
                        <div className="ph-division-grid">
                            <DivisionCard
                                title="Marketing"
                                subtitle="Boards, feeds, tours"
                                icon={<Megaphone size={16}/>}
                                color="bg-orange-600"
                                testId="open-house-marketing"
                                stats={[{ label: "Live", value: String((player.marketing?.campaigns || []).filter(row => row.ownerId === studio.id && row.status === 'LIVE').length) }]}
                                onClick={() => { setMarketingTitleId(undefined); setView('MARKETING'); }}
                            />
                            <DivisionCard
                                title={tr('studio.facilities')}
                                subtitle="Upgrades"
                                icon={<Building2 size={16}/>}
                                color="bg-blue-700"
                                stats={[{ label: "Tier", value: studio.subtype === 'MAJOR_STUDIO' ? 'Major' : 'Indie' }]}
                                onClick={() => setView('OFFICE')}
                            />
                            <DivisionCard
                                title="Offers"
                                subtitle="Platform briefs"
                                icon={<Mail size={16}/>}
                                color="bg-rose-600"
                                testId="open-offers"
                                stats={[{ label: "Open", value: String(deskOf(player).briefs.filter(row => row.direction === 'IN' && (row.status === 'OPEN' || row.status === 'REPLIED' || row.status === 'CONTRACT')).length) }]}
                                onClick={() => setView('OFFERS')}
                            />
                            <DivisionCard
                                title={tr('studio.finance')}
                                subtitle="P&L & Capital"
                                icon={<DollarSign size={16}/>}
                                color="bg-amber-500"
                                stats={[{ label: "Capital", value: formatMoney(studio.balance) }]}
                                onClick={() => setView('FINANCE')}
                            />
                            <DivisionCard
                                title={tr('studio.talent')}
                                subtitle="Farm System"
                                icon={<Users size={16}/>}
                                color="bg-violet-600"
                                stats={[{ label: "Stars", value: String(studio.studioState?.talentRoster?.length ?? player.studio?.talentRoster?.length ?? 0) }]}
                                onClick={() => setView('TALENT')}
                            />
                            <DivisionCard
                                title="Rights Library"
                                subtitle="Books & lives"
                                icon={<BookOpen size={16}/>}
                                color="bg-amber-700"
                                testId="open-rights-library"
                                stats={[{ label: "Held", value: String((studio.studioState?.rightsLibrary?.holdings || []).filter(row => row.owner === 'PLAYER' && row.status !== 'LOST' && row.status !== 'EXPIRED').length) }]}
                                onClick={() => setView('RIGHTS')}
                            />
                        </div>
                    </div>
                </div>
            </div>
                </motion.div>
            )}
            {commissionFlow && view === 'DASHBOARD' && (
                <CommissionModal player={player} flow={commissionFlow} onFlow={setCommissionFlow} onUpdatePlayer={onUpdatePlayer} onOpenLab={() => { setCommissionFlow(null); setView('DEVELOPMENT'); }} />
            )}
        </AnimatePresence>
    );
};

// --- SUB-COMPONENTS ---


// --- SUB-COMPONENTS FOR GREENLIGHT WIZARD ---




const FinanceModal: React.FC<{
    player: Player;
    studio: Business;
    onClose: () => void;
    onUpdatePlayer: (p: Player) => void;
}> = ({ player, studio, onClose, onUpdatePlayer }) => {
    const [amountStr, setAmountStr] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const amount = parseInt(amountStr.replace(/[^\d]/g, ''), 10) || 0;

    const handleInject = () => {
        if (amount <= 0) {
            setErrorMsg('Enter a valid amount to inject.');
            return;
        }
        if (amount > player.money) {
            setErrorMsg('Not enough personal cash to inject that amount.');
            return;
        }
        const updatedStudio = { 
            ...studio, 
            balance: studio.balance + amount,
            studioState: {
                ...studio.studioState,
                financeLedger: [{
                    id: `studio_ledger_inject_${player.age}_${player.currentWeek}_${Date.now()}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount,
                    type: 'CAPITAL_INJECTION',
                    label: 'Owner capital injection'
                }, ...((studio.studioState?.financeLedger || []))].slice(0, 200)
            }
        };
        const updatedBusinesses = player.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        onUpdatePlayer({
            ...player,
            money: player.money - amount,
            businesses: updatedBusinesses
        });
        setErrorMsg('');
        setAmountStr('');
    };

    const handleWithdraw = () => {
        if (amount <= 0) {
            setErrorMsg('Enter a valid amount to withdraw.');
            return;
        }
        if (amount > studio.balance) {
            setErrorMsg('Studio capital is lower than that withdrawal amount.');
            return;
        }
        const updatedStudio = { 
            ...studio, 
            balance: studio.balance - amount,
            studioState: {
                ...studio.studioState,
                financeLedger: [{
                    id: `studio_ledger_withdraw_${player.age}_${player.currentWeek}_${Date.now()}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: -amount,
                    type: 'CAPITAL_WITHDRAWAL',
                    label: 'Owner withdrawal'
                }, ...((studio.studioState?.financeLedger || []))].slice(0, 200)
            }
        };
        const updatedBusinesses = player.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        onUpdatePlayer({
            ...player,
            money: player.money + amount,
            businesses: updatedBusinesses
        });
        setErrorMsg('');
        setAmountStr('');
    };

    const formatMoney = (val: number | undefined | null) => {
        if (val === undefined || val === null || isNaN(val)) return '$0';
        if (Math.abs(val) >= 1_000_000_000_000) return `$${(val / 1_000_000_000_000).toFixed(1)}T`;
        if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
        return `$${val.toLocaleString()}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                    <h3 className="font-bold text-white">Manage Studio Funds</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white"><ArrowLeft size={20} className="rotate-180" /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <div>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Personal Cash</div>
                            <div className="text-lg font-mono font-bold text-white">{formatMoney(player.money)}</div>
                        </div>
                        <ArrowLeft size={20} className="text-zinc-600 rotate-180" />
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Studio Capital</div>
                            <div className="text-lg font-mono font-bold text-emerald-400">{formatMoney(studio.balance)}</div>
                            {(studio.studioState?.productionFund || 0) > 0 && (
                                <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                    + {formatMoney(studio.studioState!.productionFund!)} Prod. Fund
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                            <input 
                                type="text" 
                                value={amountStr} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^\d]/g, '');
                                    setErrorMsg('');
                                    setAmountStr(val ? parseInt(val).toLocaleString() : '');
                                }}
                                placeholder="0"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-8 pr-4 text-white font-mono font-bold text-lg focus:border-amber-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-zinc-500">Available: {formatMoney(player.money)} personal / {formatMoney(studio.balance)} studio</span>
                            {amount > 0 && <span className="text-zinc-600">Parsed: {formatMoney(amount)}</span>}
                        </div>
                        {errorMsg && (
                            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                                {errorMsg}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleWithdraw}
                            disabled={amount <= 0 || amount > studio.balance}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} /> Withdraw
                        </button>
                        <button 
                            onClick={handleInject}
                            disabled={amount <= 0 || amount > player.money}
                            className="bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            Inject <ArrowLeft size={16} className="rotate-180" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudioFinanceView: React.FC<{
    player: Player;
    studio: Business;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onExit: () => void;
}> = ({ player, studio, onBack, onUpdatePlayer, onExit }) => {
    const [showFinanceModal, setShowFinanceModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState<'SELL' | 'LIQUIDATE' | null>(null);
    const [ledgerRange, setLedgerRange] = useState<'12W' | '52W' | 'ALL'>('12W');
    const [visibleLedgerEntries, setVisibleLedgerEntries] = useState(12);
    const studioActiveReleases = useMemo(() => player.activeReleases.filter(r => r.projectDetails?.studioId === studio.id), [player.activeReleases, studio.id]);
    const studioLibrary = useMemo(() => player.pastProjects.filter(p => p.studioId === studio.id), [player.pastProjects, studio.id]);
    const totalProjectGross = useMemo(() => studioActiveReleases.reduce((sum, r) => sum + (r.totalGross || 0), 0) + studioLibrary.reduce((sum, p) => sum + (p.gross || 0), 0), [studioActiveReleases, studioLibrary]);
    const totalStreamingRevenue = useMemo(() => studioActiveReleases.reduce((sum, r) => sum + (r.streamingRevenue || 0), 0) + studioLibrary.reduce((sum, p) => sum + (p.streamingRevenue || 0), 0), [studioActiveReleases, studioLibrary]);
    const estimatedStudioReceipts = useMemo(() => Math.floor(totalProjectGross * 0.5) + totalStreamingRevenue, [totalProjectGross, totalStreamingRevenue]);
    const totalProductionBudget = useMemo(() => studioLibrary.reduce((sum, p) => sum + (p.budget || 0), 0), [studioLibrary]);
    const financeLedger = useMemo(() => {
        const stored = Array.isArray(studio.studioState?.financeLedger) ? studio.studioState.financeLedger : [];
        if (stored.length > 0) return stored;

        return [...studioLibrary]
            .sort((a, b) => (b.year || 0) - (a.year || 0))
            .slice(0, 8)
            .map(project => ({
                id: `derived_receipt_${project.id}`,
                week: 0,
                year: project.year || player.age,
                amount: Math.floor((project.gross || 0) * 0.5) + (project.streamingRevenue || 0),
                type: 'THEATRICAL' as const,
                label: `${project.name} studio receipts`,
                projectId: project.id
            }))
            .filter(entry => entry.amount !== 0);
    }, [studio.studioState?.financeLedger, studioLibrary, player.age]);

    useEffect(() => {
        setVisibleLedgerEntries(12);
    }, [ledgerRange]);

    const currentAbsoluteWeek = useMemo(() => ((player.age || 1) * 52) + (player.currentWeek || 1), [player.age, player.currentWeek]);
    const getEntryAbsoluteWeek = (entry: any) => ((entry.year || 1) * 52) + (entry.week || 52);

    const filteredLedger = useMemo(() => {
        const sorted = [...financeLedger].sort((a: any, b: any) => getEntryAbsoluteWeek(b) - getEntryAbsoluteWeek(a));
        if (ledgerRange === 'ALL') return sorted;
        const maxAgeInWeeks = ledgerRange === '12W' ? 12 : 52;
        return sorted.filter((entry: any) => currentAbsoluteWeek - getEntryAbsoluteWeek(entry) <= maxAgeInWeeks);
    }, [financeLedger, ledgerRange, currentAbsoluteWeek]);

    const visibleLedger = useMemo(() => filteredLedger.slice(0, visibleLedgerEntries), [filteredLedger, visibleLedgerEntries]);
    const ledgerInflows = useMemo(() => filteredLedger.filter((entry: any) => entry.amount > 0).reduce((sum: number, entry: any) => sum + entry.amount, 0), [filteredLedger]);
    const ledgerOutflows = useMemo(() => Math.abs(filteredLedger.filter((entry: any) => entry.amount < 0).reduce((sum: number, entry: any) => sum + entry.amount, 0)), [filteredLedger]);
    const ledgerNet = ledgerInflows - ledgerOutflows;

    const getLedgerTypeLabel = (type: string) => {
        switch (type) {
            case 'THEATRICAL': return 'Theatrical';
            case 'STREAMING': return 'Streaming';
            case 'STREAMING_DEAL': return 'Platform Deal';
            case 'MERCH': return 'Universe';
            case 'CAPITAL_INJECTION': return 'Injection';
            case 'CAPITAL_WITHDRAWAL': return 'Withdrawal';
            case 'PRODUCTION_SPEND': return 'Production';
            case 'COMMISSION': return 'Commission';
            case 'BONUS': return 'Bonus';
            case 'PENALTY': return 'Penalty';
            case 'RESERVE': return 'Reserve';
            case 'RIGHTS': return 'Rights';
            default: return 'Studio';
        }
    };

    const getLedgerTypeTone = (entry: any) => {
        if (entry.amount >= 0) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
        if (entry.type === 'PRODUCTION_SPEND') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
        return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
    };

    const formatLedgerDate = (entry: any) => {
        const year = entry.year || player.age;
        const week = entry.week || 0;
        if (week > 0) return `Y${year} • W${week}`;
        return `Y${year} • Archive`;
    };

    const formatMoney = (val: number | undefined | null) => {
        if (val === undefined || val === null || isNaN(val)) return '$0';
        if (Math.abs(val) >= 1_000_000_000_000) return `$${(val / 1_000_000_000_000).toFixed(1)}T`;
        if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
        return `$${val.toLocaleString()}`;
    };

    const sellCheck = sellBusiness(studio);
    const liquidateCheck = liquidateBusiness(studio);

    const executeExit = () => {
        if (!showExitModal) return;

        if (showExitModal === 'SELL') {
            const res = sellBusiness(studio);
            if (!res.success) {
                alert(res.msg);
                setShowExitModal(null);
                return;
            }
            const updatedBusinesses = player.businesses.filter(b => b.id !== studio.id);
            const newMoney = player.money + res.payout;
            onUpdatePlayer({ 
                ...player, 
                money: newMoney, 
                businesses: updatedBusinesses,
                logs: [...player.logs, { week: player.currentWeek, year: player.age, message: res.msg, type: 'positive' }]
            });
            onExit();
        } 
        else if (showExitModal === 'LIQUIDATE') {
            const res = liquidateBusiness(studio);
            const updatedBusinesses = player.businesses.filter(b => b.id !== studio.id);
            const newMoney = player.money + res.payout;
            onUpdatePlayer({ 
                ...player, 
                money: newMoney, 
                businesses: updatedBusinesses,
                logs: [...player.logs, { week: player.currentWeek, year: player.age, message: res.msg, type: 'neutral' }]
            });
            onExit();
        }
    };

    return (
        <div className="absolute inset-0 bg-[#050505] flex flex-col z-[60] text-white animate-in slide-in-from-right duration-300 font-sans">
            {/* HEADER */}
            <div className="relative pt-12 pb-6 px-6 bg-zinc-900/50 border-b border-white/5 backdrop-blur-xl shrink-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onBack} className="bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors border border-white/5"><ArrowLeft size={18} /></button>
                    <div className="flex gap-2">
                        <button onClick={() => setShowFinanceModal(true)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-500/20 transition-colors">Manage Funds</button>
                    </div>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none mb-1">Finance Dept</h1>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">Corporate Accounting</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Studio Capital</div>
                        <div className="font-mono font-bold text-emerald-400 text-lg">{formatMoney(studio.balance)}</div>
                        {(studio.studioState?.productionFund || 0) > 0 && (
                            <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                + {formatMoney(studio.studioState!.productionFund!)} Prod. Fund
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-nav-safe-lg">
                
                {/* P&L Statement */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
                    <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">P&L Statement</h3>
                        <div className="text-[10px] font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-400">This Week</div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-zinc-400 font-bold uppercase">Studio Receipts</div>
                            <div className="font-mono font-bold text-emerald-400">{formatMoney(studio.stats?.weeklyRevenue || 0)}</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-zinc-400 font-bold uppercase">Operating Costs</div>
                            <div className="font-mono font-bold text-rose-500">-{formatMoney(studio.stats?.weeklyExpenses || 0)}</div>
                        </div>
                        <div className="h-px bg-zinc-800 w-full"></div>
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-white font-bold uppercase">Net Profit</div>
                            <div className={`font-mono font-bold text-lg ${(studio.stats?.weeklyProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {formatMoney(studio.stats?.weeklyProfit || 0)}
                            </div>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-zinc-300 leading-relaxed">
                            Project tiles show <span className="text-white font-semibold">project revenue</span>. Detailed studio receipts and cash movement live in the ledger and project detail views.
                        </div>
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">Revenue Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Project Gross</div>
                            <div className="font-mono font-bold text-white">{formatMoney(totalProjectGross)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Streaming Revenue</div>
                            <div className="font-mono font-bold text-emerald-400">{formatMoney(totalStreamingRevenue)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Estimated Studio Receipts</div>
                            <div className="font-mono font-bold text-amber-300">{formatMoney(estimatedStudioReceipts)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Library ROI</div>
                            <div className={`font-mono font-bold ${totalProductionBudget > 0 && estimatedStudioReceipts >= totalProductionBudget ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {totalProductionBudget > 0 ? `${(((estimatedStudioReceipts - totalProductionBudget) / Math.max(1, totalProductionBudget)) * 100).toFixed(0)}%` : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">Balance Sheet</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Cash</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.balance)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Total Valuation</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.stats?.valuation || 0)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Production Fund</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.studioState?.productionFund || 0)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Lifetime Revenue</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.stats?.lifetimeRevenue || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Ledger */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
                    <div className="border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 px-6 py-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <WalletCards size={16} className="text-amber-400" />
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">Studio Passbook</h3>
                                </div>
                                <div className="text-[11px] text-zinc-500">Cash movement by period. Tap through newer and older receipts like a bank ledger.</div>
                            </div>
                            <div className="flex rounded-full border border-zinc-800 bg-black/30 p-1 shrink-0">
                                {[
                                    { id: '12W', label: '3 Mo' },
                                    { id: '52W', label: '1 Yr' },
                                    { id: 'ALL', label: 'All' }
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setLedgerRange(option.id as '12W' | '52W' | 'ALL')}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                            ledgerRange === option.id ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Money In</div>
                                <div className="font-mono font-bold text-emerald-400">{formatMoney(ledgerInflows)}</div>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Money Out</div>
                                <div className="font-mono font-bold text-rose-400">{formatMoney(ledgerOutflows)}</div>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Net Flow</div>
                                <div className={`font-mono font-bold ${ledgerNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{ledgerNet >= 0 ? '+' : '-'}{formatMoney(Math.abs(ledgerNet))}</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {visibleLedger.length > 0 ? visibleLedger.map((entry: any) => (
                            <div key={entry.id} className="rounded-[1.4rem] border border-zinc-800 bg-black/25 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${getLedgerTypeTone(entry)}`}>
                                                {entry.amount >= 0 ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                {getLedgerTypeLabel(entry.type)}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{formatLedgerDate(entry)}</span>
                                        </div>
                                        <div className="text-sm font-bold text-white leading-tight">{entry.label}</div>
                                        <div className="mt-1 text-[11px] text-zinc-500">
                                            {entry.projectId ? `Project Ref • ${entry.projectId}` : 'Studio cash entry'}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={`font-mono font-bold text-base ${entry.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {entry.amount >= 0 ? '+' : '-'}{formatMoney(Math.abs(entry.amount))}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                                            {entry.amount >= 0 ? 'Credit' : 'Debit'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-[1.4rem] border border-zinc-800 bg-black/30 px-4 py-6 text-center">
                                <div className="text-sm font-bold text-zinc-400 mb-1">No ledger entries in this period</div>
                                <div className="text-[11px] text-zinc-600">Try switching to a wider range to view older studio activity.</div>
                            </div>
                        )}
                        {visibleLedgerEntries < filteredLedger.length && (
                            <button
                                onClick={() => setVisibleLedgerEntries(prev => prev + 12)}
                                className="w-full rounded-[1.2rem] border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-900 transition-colors"
                            >
                                Load Older Entries
                            </button>
                        )}
                    </div>
                </div>
                
                {/* EXIT STRATEGY SECTION */}
                <div className="bg-red-950/20 border border-red-500/20 rounded-[2rem] p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4 flex items-center gap-2"><LogOut size={16} className="text-red-500"/> Exit Strategy</h3>
                        {(studio as any).sourceStudioId ? (
                            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4 text-xs leading-relaxed text-zinc-400">
                                This studio was acquired. Sell it from <span className="font-bold text-white">Studio Group</span>, because the sale has to settle your acquisition loan and your ownership stake.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Sell Option */}
                                <button 
                                    onClick={() => setShowExitModal('SELL')} 
                                    disabled={!sellCheck.success}
                                    className={`w-full p-4 rounded-xl border flex flex-col gap-1 transition-all ${
                                        sellCheck.success 
                                        ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/40 text-left' 
                                        : 'bg-zinc-900/50 border-zinc-800 opacity-60 cursor-not-allowed text-center'
                                    }`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <div className={`font-bold text-sm ${sellCheck.success ? 'text-emerald-400' : 'text-zinc-500'}`}>Sell Studio</div>
                                        {sellCheck.success && <div className="text-xs font-mono font-bold text-white">Est. {formatMoney(sellCheck.payout)}</div>}
                                    </div>
                                    {!sellCheck.success && <div className="text-[10px] text-zinc-500 font-normal">{sellCheck.msg}</div>}
                                </button>

                                {/* Liquidate Option */}
                                <button 
                                    onClick={() => setShowExitModal('LIQUIDATE')}
                                    className="w-full p-4 rounded-xl border border-rose-500/30 bg-rose-950/10 hover:bg-rose-950/30 transition-all flex flex-col gap-1 text-left"
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <div className="font-bold text-sm text-rose-400">Shut Down & Liquidate</div>
                                        <div className="text-xs font-mono font-bold text-zinc-400">Est. {formatMoney(liquidateCheck.payout)}</div>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-normal">Close operations. Assets sold for scrap.</div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showFinanceModal && (
                <FinanceModal 
                    player={player} 
                    studio={studio} 
                    onClose={() => setShowFinanceModal(false)} 
                    onUpdatePlayer={onUpdatePlayer} 
                />
            )}

            {showExitModal && (
                <div className="fixed inset-0 z-[60] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-red-500/30 p-6 shadow-2xl relative text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
                             <AlertTriangle size={32} className="text-red-500"/>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{showExitModal === 'SELL' ? 'Sell Studio' : 'Shut Down'}</h3>
                        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                            {showExitModal === 'SELL' 
                                ? `Are you sure you want to sell ${studio.name}? You will receive the valuation amount plus any cash in the business account.`
                                : `Are you sure you want to shut down? Assets will be liquidated for scrap value. This cannot be undone.`
                            }
                        </p>
                        
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 mb-6">
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">Cash Balance</span>
                                <span className={studio.balance >= 0 ? 'text-white' : 'text-rose-500'}>{formatMoney(studio.balance)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">{showExitModal === 'SELL' ? 'Valuation' : 'Scrap Value'}</span>
                                <span className="text-white">
                                    {showExitModal === 'SELL' ? formatMoney(studio.stats.valuation) : formatMoney(liquidateCheck.payout - studio.balance)}
                                </span>
                            </div>
                            <div className="border-t border-zinc-700 my-2"></div>
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-white uppercase">Net Payout</span>
                                <span className={showExitModal === 'SELL' ? 'text-emerald-400' : 'text-zinc-200'}>
                                    {showExitModal === 'SELL' ? formatMoney(sellCheck.payout) : formatMoney(liquidateCheck.payout)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowExitModal(null)} className="py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700">Cancel</button>
                            <button onClick={executeExit} className="py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 shadow-lg shadow-red-900/20">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const getPosterBg = (title: string = '') => {
    const colors = [
        'from-red-950 via-red-900 to-black',
        'from-blue-950 via-blue-900 to-black',
        'from-emerald-950 via-emerald-900 to-black',
        'from-purple-950 via-purple-900 to-black',
        'from-amber-950 via-amber-900 to-black',
        'from-rose-950 via-rose-900 to-black',
        'from-cyan-950 via-cyan-900 to-black',
        'from-indigo-950 via-indigo-900 to-black',
    ];
    const charCode = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCode % colors.length];
};

const getCustomPoster = (project: any) => {
    return project.customPoster || project.projectDetails?.customPoster || project.concept?.customPoster;
};

const getStudioArchiveRevenue = (project: any) => {
    return (project.gross || 0) + (project.streamingRevenue || project.projectDetails?.streamingRevenue || 0);
};

const getStudioArchiveProfit = (project: any) => {
    return getStudioArchiveRevenue(project) - (project.budget || project.projectDetails?.estimatedBudget || 0);
};

const getStudioArchiveRating = (project: any) => {
    return Number(project.rating || project.imdbRating || 0);
};

const getStudioArchiveDateValue = (project: any) => {
    const details = project.projectDetails || {};
    const year = Number(project.year || project.releaseYear || details.releaseYear || details.year || 0);
    const week = Number(project.releaseWeek || details.releaseWeek || project.weekNum || 0);
    const activeBoost = project.phase === 'IN THEATERS' || project.phase === 'STREAMING' || project.phase === 'BIDDING' ? 100000 : 0;
    return activeBoost + (year * 60) + week;
};

function sortStudioArchiveByRecent(a: any, b: any) {
    return getStudioArchiveDateValue(b) - getStudioArchiveDateValue(a);
}

type FilmographySort = 'RECENT' | 'RATING' | 'REVENUE' | 'PROFIT';
type FilmographyFilter = 'ALL' | 'MOVIE' | 'SERIES' | 'THEATRICAL' | 'STREAMING' | 'FRANCHISE';

const StudioFilmographyView: React.FC<{
    projects: any[];
    studio: Business;
    language: GameLanguage;
    onBack: () => void;
    onOpenProject: (project: any) => void;
}> = ({ projects, studio, language, onBack, onOpenProject }) => {
    const [sortMode, setSortMode] = useState<FilmographySort>('RECENT');
    const [filterMode, setFilterMode] = useState<FilmographyFilter>('ALL');
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    const filteredProjects = useMemo(() => {
        const filtered = projects.filter(project => {
            if (filterMode === 'MOVIE') return project.type === 'MOVIE' || project.projectDetails?.type === 'MOVIE';
            if (filterMode === 'SERIES') return project.type === 'SERIES' || project.projectDetails?.type === 'SERIES';
            if (filterMode === 'THEATRICAL') return project.phase === 'IN THEATERS' || project.distributionPhase === 'THEATRICAL';
            if (filterMode === 'STREAMING') return project.phase === 'STREAMING' || project.distributionPhase === 'STREAMING' || !!project.streamingRevenue || !!project.views;
            if (filterMode === 'FRANCHISE') return !!(project.franchiseId || project.universeId || project.projectDetails?.franchiseId || project.projectDetails?.universeId);
            return true;
        });

        return filtered.sort((a, b) => {
            if (sortMode === 'RATING') return getStudioArchiveRating(b) - getStudioArchiveRating(a) || sortStudioArchiveByRecent(a, b);
            if (sortMode === 'REVENUE') return getStudioArchiveRevenue(b) - getStudioArchiveRevenue(a) || sortStudioArchiveByRecent(a, b);
            if (sortMode === 'PROFIT') return getStudioArchiveProfit(b) - getStudioArchiveProfit(a) || sortStudioArchiveByRecent(a, b);
            return sortStudioArchiveByRecent(a, b);
        });
    }, [projects, filterMode, sortMode]);

    const totalRevenue = projects.reduce((sum, project) => sum + getStudioArchiveRevenue(project), 0);
    const avgRating = projects.length > 0 ? projects.reduce((sum, project) => sum + getStudioArchiveRating(project), 0) / projects.length : 0;
    const bestHit = [...projects].sort((a, b) => getStudioArchiveRevenue(b) - getStudioArchiveRevenue(a))[0];

    return (
        <div className="absolute inset-0 bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
            <div className="relative shrink-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 pt-12 pb-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">{tr('studio.filmography.eyebrow')}</div>
                        <h1 className="text-2xl font-black tracking-tight text-white leading-tight truncate">{tr('studio.filmography.title', { studio: studio.name })}</h1>
                    </div>
                    <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
                        {tr('studio.filmography.titles', { count: projects.length })}
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                    <FilmographyMetric label={tr('studio.filmography.projects')} value={`${projects.length}`} />
                    <FilmographyMetric label={tr('studio.filmography.avgRating')} value={avgRating > 0 ? avgRating.toFixed(1) : '-.--'} />
                    <FilmographyMetric label={tr('studio.filmography.revenue')} value={formatMoney(totalRevenue)} />
                </div>
                {bestHit && (
                    <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/35 px-4 py-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('studio.filmography.topEarner')}</div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate text-sm font-bold text-white">{bestHit.name}</div>
                            <div className="shrink-0 font-mono text-xs font-black text-emerald-400">{formatMoney(getStudioArchiveRevenue(bestHit))}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="shrink-0 border-b border-zinc-900 bg-black/80 px-4 py-3 backdrop-blur-xl space-y-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'RECENT', label: tr('studio.filmography.sort.recent') },
                        { id: 'RATING', label: tr('studio.filmography.sort.rating') },
                        { id: 'REVENUE', label: tr('studio.filmography.sort.revenue') },
                        { id: 'PROFIT', label: tr('studio.filmography.sort.profit') }
                    ].map(option => (
                        <button
                            key={option.id}
                            onClick={() => setSortMode(option.id as FilmographySort)}
                            className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                sortMode === option.id ? 'bg-amber-500 text-black' : 'border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'ALL', label: tr('studio.filmography.filter.all') },
                        { id: 'MOVIE', label: tr('studio.filmography.filter.movies') },
                        { id: 'SERIES', label: tr('studio.filmography.filter.series') },
                        { id: 'THEATRICAL', label: tr('studio.filmography.filter.theatrical') },
                        { id: 'STREAMING', label: tr('studio.filmography.filter.streaming') },
                        { id: 'FRANCHISE', label: tr('studio.filmography.filter.franchise') }
                    ].map(option => (
                        <button
                            key={option.id}
                            onClick={() => setFilterMode(option.id as FilmographyFilter)}
                            className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                filterMode === option.id ? 'bg-white text-black' : 'border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-200'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 pb-24">
                {filteredProjects.length > 0 ? (
                    <div className="space-y-3">
                        {filteredProjects.map(project => (
                            <FilmographyProjectRow key={project.id} project={project} language={language} onClick={() => onOpenProject(project)} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-5 py-10 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-zinc-500">
                            <Film size={22} />
                        </div>
                        <div className="text-sm font-black text-white">{tr('studio.filmography.empty')}</div>
                        <div className="mt-1 text-xs text-zinc-500">{tr('studio.filmography.emptySub')}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FilmographyMetric = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-zinc-800 bg-black/35 px-3 py-3 min-w-0">
        <div className="truncate text-[8px] font-black uppercase tracking-widest text-zinc-500">{label}</div>
        <div className="mt-1 truncate text-sm font-black text-white">{value}</div>
    </div>
);

const getArchiveStatusLabel = (status: string, language: GameLanguage) => {
    const normalized = status.toUpperCase();
    if (normalized === 'IN THEATERS' || normalized === 'THEATRICAL') return t(language, 'studio.filmography.status.inTheaters');
    if (normalized === 'STREAMING') return t(language, 'studio.filmography.status.streaming');
    if (normalized === 'BIDDING' || normalized === 'STREAMING_BIDDING') return t(language, 'studio.filmography.status.bidding');
    if (normalized === 'RELEASED') return t(language, 'studio.filmography.status.released');
    return status;
};

const FilmographyProjectRow: React.FC<{ project: any; language: GameLanguage; onClick: () => void }> = ({ project, language, onClick }) => {
    const revenue = getStudioArchiveRevenue(project);
    const profit = getStudioArchiveProfit(project);
    const rating = getStudioArchiveRating(project);
    const type = project.type || project.projectDetails?.type || 'MOVIE';
    const genre = project.genre || project.projectDetails?.genre || 'Studio';
    const status = project.phase || (project.distributionPhase === 'STREAMING' ? 'STREAMING' : project.distributionPhase === 'THEATRICAL' ? 'IN THEATERS' : 'RELEASED');
    const year = project.year || project.projectDetails?.releaseYear || project.projectDetails?.year || 'Now';
    const franchiseName = project.universeSagaName || project.projectDetails?.universeSagaName || (project.universeId || project.projectDetails?.universeId ? 'Universe' : project.franchiseId || project.projectDetails?.franchiseId ? 'Franchise' : '');
    const customPoster = getCustomPoster(project);

    return (
        <button
            onClick={onClick}
            className="group w-full rounded-[1.45rem] border border-zinc-800 bg-zinc-950/90 p-3 text-left transition-all hover:border-amber-500/40 hover:bg-zinc-900"
        >
            <div className="flex gap-3">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
                    {(customPoster?.type === 'IMAGE' || customPoster?.type === 'CANVA') && customPoster.imageData ? (
                        <img src={customPoster.imageData} alt={project.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${customPoster?.bgGradient || getPosterBg(project.name)} flex items-center justify-center p-1`}>
                            <div className="text-center font-serif text-lg font-black uppercase leading-none tracking-tighter text-white/25 -rotate-6">
                                {project.name}
                            </div>
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black to-transparent" />
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="line-clamp-2 text-base font-black leading-tight text-white group-hover:text-amber-100">
                                {project.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <span>{year}</span>
                                <span>•</span>
                                <span>{type}</span>
                                <span>•</span>
                                <span>{genre}</span>
                            </div>
                        </div>
                        <ChevronRight size={17} className="mt-1 shrink-0 text-zinc-600 group-hover:text-amber-300" />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-zinc-700 bg-black/40 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                            {getArchiveStatusLabel(status, language)}
                        </span>
                        {franchiseName && (
                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300">
                                {franchiseName}
                            </span>
                        )}
                        {rating > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500 px-2.5 py-1 text-[9px] font-black text-black">
                                <Star size={10} className="fill-black" /> {rating.toFixed(1)}
                            </span>
                        )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <CompactArchiveStat label={t(language, 'studio.filmography.metric.revenue')} value={formatMoney(revenue)} tone="text-emerald-400" />
                        <CompactArchiveStat label={t(language, 'studio.filmography.metric.profit')} value={`${profit >= 0 ? '+' : '-'}${formatMoney(Math.abs(profit))}`} tone={profit >= 0 ? 'text-amber-300' : 'text-rose-300'} />
                        <CompactArchiveStat label={project.views ? t(language, 'studio.filmography.metric.views') : t(language, 'studio.filmography.metric.budget')} value={project.views ? `${(project.views / 1000000).toFixed(1)}M` : formatMoney(project.budget || 0)} tone="text-zinc-200" />
                    </div>
                </div>
            </div>
        </button>
    );
};

const CompactArchiveStat = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-black/30 px-2.5 py-2">
        <div className="truncate text-[8px] font-black uppercase tracking-widest text-zinc-600">{label}</div>
        <div className={`mt-0.5 truncate text-[11px] font-black font-mono ${tone}`}>{value}</div>
    </div>
);

const studioInitials = (name: string) => {
    const parts = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "ST";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const slateKind = (type?: string) => {
    const key = String(type || "").toUpperCase();
    if (key === "MOVIE" || key === "FILM" || key === "THEATRICAL") return "Film";
    if (key === "SERIES" || key === "TV") return "Series";
    if (!key) return "Project";
    return key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

const slateMoney = (val: number) => {
    const amount = Number(val) || 0;
    if (Math.abs(amount) >= 1_000_000_000_000) return `$${(amount / 1_000_000_000_000).toFixed(1)}T`;
    if (Math.abs(amount) >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${Math.round(amount)}`;
};

const SlatePoster: React.FC<{ project: any; badge: string; children?: React.ReactNode }> = ({ project, badge, children }) => {
    const customPoster = getCustomPoster(project);
    const hasImage = (customPoster?.type === "IMAGE" || customPoster?.type === "CANVA") && customPoster.imageData;
    return (
        <div className={`ph-slate-poster bg-gradient-to-br ${customPoster?.bgGradient || getPosterBg(project.name)}`}>
            {hasImage && <img src={customPoster.imageData} alt="" />}
            <div className="ph-slate-shade" />
            {!hasImage && <div className="ph-slate-title">{project.name}</div>}
            {children}
            {badge && <div className="ph-phase">{badge}</div>}
        </div>
    );
};

const ActiveProjectCard: React.FC<{ project: any, onClick?: () => void, onDelete?: () => void }> = ({ project, onClick, onDelete }) => {
    const budget = project.projectDetails?.estimatedBudget || project.budget || 0;
    const showTime = ["PRE-PRODUCTION", "PRODUCTION", "POST-PRODUCTION", "AWAITING RELEASE", "PLANNED RELEASE"].includes(project.phase);
    const weeksLeft = project.phaseWeeksLeft || 0;
    const customPoster = getCustomPoster(project);
    const hasImage = (customPoster?.type === "IMAGE" || customPoster?.type === "CANVA") && customPoster.imageData;
    return (
        <div className="ph-slate-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onClick?.(); }}>
            <SlatePoster project={project} badge={project.phase || ""}>
                {project.phase === "CONCEPT" && onDelete && (
                    <button type="button" className="ph-delete" aria-label="Delete concept" onClick={(event) => { event.stopPropagation(); onDelete(); }}>
                        <X size={12} />
                    </button>
                )}
            </SlatePoster>
            <div className="ph-slate-meta">
                <span>{hasImage ? project.name : `${slateKind(project.type)}${showTime ? ` · ${weeksLeft}w` : ""}`}</span>
                <b>{slateMoney(budget)}</b>
            </div>
        </div>
    );
};

const ArchiveProjectCard: React.FC<{ project: any, isLatestInstallment?: boolean, onClick?: () => void }> = ({ project, onClick }) => {
    const projectRevenue = (project.gross || 0) + (project.streamingRevenue || project.projectDetails?.streamingRevenue || 0);
    const budget = project.budget || 0;
    let outcomeLabel = "Average";
    if (projectRevenue > budget * 5) outcomeLabel = "Blockbuster";
    else if (projectRevenue > budget * 2) outcomeLabel = "Hit";
    else if (budget > 0 && projectRevenue < budget) outcomeLabel = "Flop";
    const rating = project.rating || project.imdbRating;
    const hasAwards = project.awards && project.awards.filter((award: any) => award.outcome === "WON").length > 0;
    const status = project.phase || "Released";
    const customPoster = getCustomPoster(project);
    const hasImage = (customPoster?.type === "IMAGE" || customPoster?.type === "CANVA") && customPoster.imageData;
    return (
        <div className="ph-slate-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onClick?.(); }}>
            <SlatePoster project={project} badge={status}>
                {hasAwards && <Award size={14} className="absolute right-2 top-2 z-[2] text-amber-300" />}
            </SlatePoster>
            <div className="ph-slate-meta">
                <span>{hasImage ? project.name : `${outcomeLabel}${rating ? ` · ${Number(rating).toFixed(1)}` : ""}`}</span>
                <b>{slateMoney(projectRevenue)}</b>
            </div>
        </div>
    );
};

const DivisionCard: React.FC<{ title: string, subtitle: string, icon: React.ReactNode, color: string, stats: {label: string, value: string}[], onClick: () => void, locked?: boolean, testId?: string, featured?: boolean }> = ({ title, subtitle, icon, color, stats, onClick, locked, testId, featured }) => (
    <button data-testid={testId} type="button" onClick={locked ? undefined : onClick} disabled={!!locked} className={`ph-division ${featured ? "ph-division-feature" : ""} ${locked ? "cursor-not-allowed opacity-50" : ""}`}>
        <span className={`ph-division-icon ${color}`}>{locked ? <Lock size={14} /> : icon}</span>
        <span className="ph-division-copy">
            <strong>{title}</strong>
            <em>{!locked && stats.length > 0 ? `${stats[0].value} ${stats[0].label}` : subtitle}</em>
        </span>
    </button>
);
