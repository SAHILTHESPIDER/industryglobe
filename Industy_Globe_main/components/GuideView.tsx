import React, { useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Clock3,
  DollarSign,
  Film,
  Globe,
  GraduationCap,
  Heart,
  HelpCircle,
  Landmark,
  PlayCircle,
  Sparkles,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

interface GuideViewProps {
  onBack: () => void;
}

type GuideMode = "MENU" | "HANDBOOK" | "PLAYBOOKS" | "FAQ" | "WIZARD";

type GuideSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

const GuideNote: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
      {title}
    </div>
    <div className="text-xs leading-relaxed text-zinc-300">{children}</div>
  </div>
);

const GuideBullets: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="space-y-2">
    {items.map((item) => (
      <div key={item} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
        <span>{item}</span>
      </div>
    ))}
  </div>
);

const GuideTagRow: React.FC<{ tags: string[] }> = ({ tags }) => (
  <div className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <span
        key={tag}
        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300"
      >
        {tag}
      </span>
    ))}
  </div>
);

const WIZARD_STEPS = [
  {
    title: "Welcome to Industry Globe",
    eyebrow: "YOUR STORY. YOUR EMPIRE.",
    icon: <Star size={36} className="text-amber-300" />,
    content:
      "You are building a life, not just chasing one role. Balance your career, money, fame, relationships, studio power, and long-term planning.",
    color: "from-amber-500/20 to-orange-500/5",
  },
  {
    title: "Master the Weekly Loop",
    eyebrow: "TIME IS YOUR MOST VALUABLE RESOURCE",
    icon: <Clock3 size={36} className="text-sky-300" />,
    content:
      "Every week is a resource puzzle. Spend energy on acting, social growth, business, or personal life, then advance time to see the results.",
    color: "from-sky-500/20 to-blue-500/5",
  },
  {
    title: "Build Your Career",
    eyebrow: "START SMALL. BUILD MOMENTUM.",
    icon: <Film size={36} className="text-violet-300" />,
    content:
      "Use auditions, preparation, representation, and strong performances to build a credible career. Consistent progress usually beats waiting for one giant opportunity.",
    color: "from-violet-500/20 to-fuchsia-500/5",
  },
  {
    title: "Become an Owner",
    eyebrow: "FROM CREATIVE TO EXECUTIVE",
    icon: <Clapperboard size={36} className="text-rose-300" />,
    content:
      "Develop scripts, greenlight projects, manage budgets, plan releases, and grow a valuable catalogue. Think about the full project lifecycle.",
    color: "from-rose-500/20 to-pink-500/5",
  },
  {
    title: "Go Global",
    eyebrow: "THINK BEYOND ONE MARKET",
    icon: <Globe size={36} className="text-cyan-300" />,
    content:
      "Expand your audience through distribution, streaming, licensing, regional strategy, and connected stories. Build a sustainable empire, not just a headline.",
    color: "from-cyan-500/20 to-blue-500/5",
  },
];

const HANDBOOK_SECTIONS: GuideSection[] = [
  {
    id: "GETTING_STARTED",
    title: "Getting Started",
    icon: <GraduationCap size={18} className="text-sky-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Your first goal:</strong> create reliable momentum. Small wins in auditions, social activity, and money management usually beat risky all-in plays at the start.</p>
        <p><strong className="text-white">Think week to week:</strong> every decision competes for your time and energy. If you spread yourself too thin, progress slows everywhere.</p>
        <p><strong className="text-white">Use your apps:</strong> career tools help you find work, management tools track contracts, social apps build reach, and this guide explains the bigger systems.</p>
      </div>
    ),
  },
  {
    id: "STATS",
    title: "Stats Explained",
    icon: <Sparkles size={18} className="text-amber-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Fame:</strong> your public profile. It helps you get seen, land bigger opportunities, and stay culturally relevant.</p>
        <p><strong className="text-white">Reputation:</strong> how seriously the industry takes you. It supports trust, credibility, and professional outcomes.</p>
        <p><strong className="text-white">Followers:</strong> your social reach. Useful for influence and sponsorships, but followers alone will not carry an acting career.</p>
        <p><strong className="text-white">Mood and energy:</strong> these shape how much you can do and how strong your weeks feel.</p>
      </div>
    ),
  },
  {
    id: "CAREER",
    title: "Career Flow",
    icon: <Film size={18} className="text-violet-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Find opportunities:</strong> use career listings and representation to discover roles that fit your profile.</p>
        <p><strong className="text-white">Preparation matters:</strong> rehearsals and smart role selection help your performances feel more consistent.</p>
        <p><strong className="text-white">Career growth:</strong> early game is about building a record, mid game is about momentum, and late game is about leverage and legacy.</p>
      </div>
    ),
  },
  {
    id: "WEEKLY_LOOP",
    title: "Weekly Loop & Energy",
    icon: <Zap size={18} className="text-yellow-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Energy is your weekly fuel:</strong> acting, social moves, business work, and personal actions all draw from it.</p>
        <p><strong className="text-white">Do not waste empty weeks:</strong> build skills, relationships, visibility, or business progress while waiting on projects.</p>
        <p><strong className="text-white">Recovery has value:</strong> restoring your character can make the next few weeks more productive.</p>
      </div>
    ),
  },
  {
    id: "SOCIAL_MEDIA",
    title: "Fame, Followers & Social Media",
    icon: <Smartphone size={18} className="text-pink-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Social media keeps you visible and can support your entertainment career.</p>
        <p>Different platforms serve different audiences. Visual content can strengthen your image, short-form content can grow reach, and long-form content can deepen audience loyalty.</p>
        <p>Use social activity with purpose. Not every post needs to chase virality.</p>
      </div>
    ),
  },
  {
    id: "RELATIONSHIPS",
    title: "Relationships & Networking",
    icon: <Heart size={18} className="text-rose-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Professional relationships with directors, agents, managers, and contacts can change the quality of opportunities you see.</p>
        <p>Personal relationships and family are part of the life simulation too. Neglect can create strain, while healthy bonds support a stronger life path.</p>
        <p>Networking works best over time. Repeated effort usually beats one expensive gesture.</p>
      </div>
    ),
  },
  {
    id: "BUSINESSES",
    title: "Businesses & Management",
    icon: <Building2 size={18} className="text-emerald-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Businesses can become long-term income engines, but they need active management.</p>
        <p>Pricing, quality, hype, staffing, stock, and expansion all matter. If one part is weak, profits can stall even when another looks strong.</p>
        <p>Marketing works best when the product, capacity, and operations are ready to handle demand.</p>
      </div>
    ),
  },
  {
    id: "PRODUCTION_HOUSE",
    title: "Production House",
    icon: <Clapperboard size={18} className="text-violet-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Think in stages: development, production, release, and the long-term life of the title all matter.</p>
        <p>Not every project should be rushed. Planning can produce better outcomes than forcing everything out quickly.</p>
        <p>Your catalogue matters. A studio becomes more resilient when it builds a library instead of relying on one hit.</p>
      </div>
    ),
  },
  {
    id: "DEVELOPMENT_LAB",
    title: "Development Lab & Scripts",
    icon: <BookOpen size={18} className="text-amber-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Vault:</strong> saved scripts and concepts wait here until you are ready to develop, sell, or produce them.</p>
        <p><strong className="text-white">Concept:</strong> shape the basics, genre, tone, audience, and story identity.</p>
        <p><strong className="text-white">Market:</strong> review format, genre, quality, and whether the idea carries a franchise, biopic, or documentary hook.</p>
        <GuideNote title="Creative principle">Aim for fit, clarity, and timing instead of chasing one supposedly perfect stat.</GuideNote>
      </div>
    ),
  },
  {
    id: "SCRIPT_FORMATS",
    title: "Scripts, Genres & Formats",
    icon: <Film size={18} className="text-pink-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Format</strong> is the package, such as a movie or series.</p>
        <p><strong className="text-white">Genre</strong> is the audience promise: drama, action, biopic, sports, documentary, musical, animation, anime, and more.</p>
        <p><strong className="text-white">Tone</strong> describes how the story feels. Secondary genres should add flavour without confusing the project's identity.</p>
        <GuideTagRow tags={["Format = package", "Genre = promise", "Tone = feel", "Audience = reach"]} />
      </div>
    ),
  },
  {
    id: "GREENLIGHT",
    title: "Greenlight Flow",
    icon: <PlayCircle size={18} className="text-emerald-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Greenlight turns a script into a production plan: director, cast, crew, equipment, locations, tone, and final package.</p>
        <p>Budget is shaped by talent fees, crew quality, production choices, story scale, and the people attached.</p>
        <GuideBullets items={["Lock the cast and key creative roles.", "Connect existing characters when a project belongs to a franchise.", "Review the package for weak spots before committing."]} />
      </div>
    ),
  },
  {
    id: "FINANCE",
    title: "Money, Assets & Lifestyle",
    icon: <Landmark size={18} className="text-amber-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Large paydays feel great, but recurring expenses and commitments decide whether your account stays healthy.</p>
        <p>Assets and lifestyle choices can improve image and quality of life, but buying too much too early can slow career progress.</p>
        <p>Loans create future pressure. Keep enough cash for obligations and unexpected costs.</p>
        <p>Diversify when possible. Multiple income pillars make long runs more resilient.</p>
      </div>
    ),
  },
  {
    id: "UNIVERSES",
    title: "Franchises & Universes",
    icon: <Globe size={18} className="text-blue-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Franchises can create visibility and long-term value, but the road into major roles can be competitive.</p>
        <p>Smaller roles and cameos can become stepping stones toward stronger franchise positioning.</p>
        <p>Keep character identity consistent across sequels, events, recasts, and crossovers. Avoid duplicate versions of the same continuing character.</p>
      </div>
    ),
  },
  {
    id: "RELEASES_AWARDS",
    title: "Releases, Streaming & Awards",
    icon: <TrendingUp size={18} className="text-green-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>A title may move through theatrical performance, streaming interest, library value, awards attention, and long-tail reputation.</p>
        <p>Streaming offers can depend on project value, audience fit, momentum, and platform appetite. The highest-looking number is not always the only factor.</p>
        <p>Awards can depend on quality, performance strength, category fit, timing, and industry buzz—not popularity alone.</p>
      </div>
    ),
  },
  {
    id: "STREAMING_PLATFORM",
    title: "Streaming Platform & Global Markets",
    icon: <Globe size={18} className="text-cyan-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Build a platform with an identity:</strong> decide which audiences and genres your service should be known for before spending heavily on content.</p>
        <p><strong className="text-white">Plan your catalogue:</strong> balance original productions with licensed titles, and pay attention to rights, exclusivity, territory, and contract duration.</p>
        <p><strong className="text-white">Expand market by market:</strong> local audience fit, language, pricing, payment options, and distribution all influence adoption.</p>
        <p><strong className="text-white">Track sustainability:</strong> subscriber growth matters, but so do churn, content costs, operating expenses, and cash runway.</p>
        <GuideTagRow tags={["Content", "Rights", "Pricing", "Regions", "Operating Costs"]} />
      </div>
    ),
  },
  {
    id: "GLOBAL_PRODUCTION",
    title: "Production House to Global Empire",
    icon: <Clapperboard size={18} className="text-rose-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p><strong className="text-white">Plan a slate, not just one title:</strong> combine safer projects, ambitious bets, and long-term intellectual property.</p>
        <p><strong className="text-white">Protect the budget:</strong> match project scale to your available cash, studio capacity, and expected market opportunity.</p>
        <p><strong className="text-white">Build multiple release paths:</strong> theatrical distribution, streaming, licensing, international sales, and catalogue value can each play a role.</p>
        <p><strong className="text-white">Expand deliberately:</strong> grow your team and market reach as your catalogue and cash flow become more dependable.</p>
        <GuideNote title="Owner mindset">A successful entertainment empire needs creative quality, financial discipline, reliable operations, and a catalogue that keeps creating value over time.</GuideNote>
      </div>
    ),
  },
  {
    id: "LEGACY",
    title: "Legacy & Long-Term Play",
    icon: <Users size={18} className="text-cyan-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Industry Globe rewards long saves: careers rise and fall, businesses mature, and family choices change the shape of your run.</p>
        <p>Legacy is about continuity. Your choices now can shape what the next chapter inherits.</p>
        <p>The strongest dynasties balance status, wealth, stability, relationships, and meaningful work.</p>
      </div>
    ),
  },
];

const PLAYBOOK_SECTIONS: GuideSection[] = [
  {
    id: "EARLY_GAME",
    title: "Early Game: Build Momentum",
    icon: <Zap size={18} className="text-yellow-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Early saves are about creating options. Build experience, keep money healthy, and avoid burning every week on one stat.</p>
        <GuideBullets items={["Take roles that build experience instead of waiting forever for perfect prestige.", "Use spare weeks for skills, relationships, and visibility.", "Avoid lifestyle purchases that trap your cash flow too early."]} />
        <GuideNote title="Good instinct">If a choice makes the next ten weeks easier, it may be better than a flashy move that only looks good this week.</GuideNote>
      </div>
    ),
  },
  {
    id: "ACTOR_CAREER",
    title: "Actor Career: From Work to Leverage",
    icon: <Film size={18} className="text-violet-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Your career grows through talent, preparation, public attention, reputation, relationships, and the quality of past work.</p>
        <GuideBullets items={["Use career listings for opportunities and management tools for contracts.", "Build enough consistency that bigger projects feel earned.", "The right role at the right moment can beat a larger role your profile cannot support yet."]} />
      </div>
    ),
  },
  {
    id: "STUDIO_SLATE",
    title: "Studio Slate: Develop Like an Owner",
    icon: <Clapperboard size={18} className="text-rose-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>A studio becomes stronger when you plan a slate, not just one swing. Mix safer projects, ambitious bets, and long-term IP.</p>
        <GuideBullets items={["Keep scripts ready so you are not forced to greenlight weak ideas.", "Match project scale to cash, studio strength, and market conditions.", "Use past projects to understand what your studio is becoming known for."]} />
      </div>
    ),
  },
  {
    id: "GLOBAL_EXPANSION",
    title: "Streaming & Global Expansion",
    icon: <Globe size={18} className="text-cyan-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Expansion adds opportunity and complexity. Do not treat every new market as guaranteed profit.</p>
        <GuideBullets items={["Check content rights and territory restrictions before licensing.", "Localize content and pricing for the audience you want to reach.", "Monitor operating costs, subscriber retention, and cash runway as you grow."]} />
      </div>
    ),
  },
  {
    id: "UNIVERSE_WORKFLOW",
    title: "Universe Workflow: Clean Continuity",
    icon: <Globe size={18} className="text-blue-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Universes work best when character identity stays consistent. Sequels, crossovers, and events should feel connected instead of duplicated.</p>
        <GuideBullets items={["Continue existing character identities in sequels.", "Connect worlds only when the project is intended to do so.", "Treat reboots as a new era while respecting the existing IP history."]} />
        <GuideNote title="Continuity rule">If the audience would recognize the character as the same role, link the character. If it is a new person or mythology, create a new one.</GuideNote>
      </div>
    ),
  },
  {
    id: "MONEY_RISK",
    title: "Money & Risk: Stay Liquid",
    icon: <DollarSign size={18} className="text-emerald-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Big moves can be exciting, but recurring costs, loans, production budgets, assets, and business expenses compete with future opportunities.</p>
        <GuideBullets items={["Keep enough cash for several weeks of commitments.", "Use loans for intentional investments, not to cover weak planning.", "A smaller project you can finish cleanly can beat a huge project that breaks your balance."]} />
      </div>
    ),
  },
  {
    id: "SOCIAL_PERSONAL",
    title: "Social & Personal: Support the Run",
    icon: <Heart size={18} className="text-rose-300" />,
    content: (
      <div className="space-y-3 text-xs text-zinc-400">
        <p>Social systems shape reach, relationships, public image, stress, and the feeling of your character's life.</p>
        <GuideBullets items={["Stay visible without letting social activity replace career progress.", "Relationships improve through consistency and good timing.", "Self-improvement is slower than instant fame, but it makes a run more stable."]} />
      </div>
    ),
  },
];

const FAQ_SECTIONS: GuideSection[] = [
  {
    id: "FAQ_ROLES",
    title: "Why am I not getting bigger roles?",
    icon: <Film size={18} className="text-violet-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">Bigger roles usually come from the full picture, not one stat. Improve talent, reputation, preparation, experience, and representation together. Some doors open faster once your career has more proof behind it.</p>,
  },
  {
    id: "FAQ_STATS",
    title: "What is the difference between fame, followers, and reputation?",
    icon: <Star size={18} className="text-amber-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400"><strong className="text-white">Fame</strong> is how known you are. <strong className="text-white">Followers</strong> are your social audience. <strong className="text-white">Reputation</strong> is how trusted and respected you are professionally. Strong runs usually build all three.</p>,
  },
  {
    id: "FAQ_BUSINESS",
    title: "Why is my business not making much money?",
    icon: <BarChart3 size={18} className="text-emerald-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">Check the whole setup, not just one lever. Pricing, hype, quality, stock, staffing, or limited expansion can hold a business back. Marketing works best when the rest of the operation is ready.</p>,
  },
  {
    id: "FAQ_ENERGY",
    title: "How do I manage energy better?",
    icon: <Zap size={18} className="text-yellow-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">Plan your week around one or two outcomes that matter most. Avoid spending energy everywhere at once. Rest and selective focus usually outperform chaotic activity.</p>,
  },
  {
    id: "FAQ_SPONSOR",
    title: "Why did I lose a sponsorship or take a fine?",
    icon: <Briefcase size={18} className="text-emerald-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">Active contracts need follow-through. Check your management tools and complete required actions on time. A good deal can still fail if you do not fulfil it.</p>,
  },
  {
    id: "FAQ_RELATIONSHIP",
    title: "Why did my relationship get worse?",
    icon: <Heart size={18} className="text-rose-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">Relationships need attention over time. Long stretches of neglect can cause strain, especially when your character is focused on career or business. Consistency matters more than one big gesture.</p>,
  },
  {
    id: "FAQ_STUDIO",
    title: "How does the production house work?",
    icon: <Clapperboard size={18} className="text-violet-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">The studio pipeline includes development, production, release timing, and catalogue building. Think like an owner managing a slate rather than a player looking for one instant jackpot.</p>,
  },
  {
    id: "FAQ_STREAMING",
    title: "What should I consider before launching a streaming platform?",
    icon: <Globe size={18} className="text-cyan-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">Think about content rights, catalogue depth, audience fit, pricing, regional availability, operating costs, and retention. Subscriber growth alone does not guarantee profitability.</p>,
  },
  {
    id: "FAQ_SCRIPT",
    title: "What is the difference between format, genre, and tone?",
    icon: <BookOpen size={18} className="text-amber-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400"><strong className="text-white">Format</strong> is the package, like movie or series. <strong className="text-white">Genre</strong> is the promise, like sports, biopic, musical, documentary, anime, or drama. <strong className="text-white">Tone</strong> is how the story feels moment to moment.</p>,
  },
  {
    id: "FAQ_CHARACTERS",
    title: "When should I link a character?",
    icon: <Users size={18} className="text-cyan-300" />,
    content: <p className="text-xs leading-relaxed text-zinc-400">Link a character when the role is meant to be the same identity across sequels, crossovers, events, or recasts. Create a new character when the person is new or the project is meant to stand alone.</p>,
  },
];

const SectionList: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  sections: GuideSection[];
  expandedSection: string | null;
  onToggle: (id: string) => void;
  onBack: () => void;
}> = ({ title, subtitle, icon, sections, expandedSection, onToggle, onBack }) => (
  <div className="absolute inset-0 z-40 flex h-full flex-col bg-[#070910] font-sans text-white">
    <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0b0e18] px-4 pb-4 pt-10">
      <button onClick={onBack} aria-label="Back to guide" className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-300 transition hover:bg-white/10">
        <ArrowLeft size={19} />
      </button>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">{icon}</div>
      <div className="min-w-0">
        <h2 className="text-lg font-black tracking-tight">{title}</h2>
        <p className="text-[11px] text-zinc-500">INDUSTRY GLOBE / GUIDE</p>
      </div>
    </div>
    <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24">
      <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{subtitle}</p>
      {sections.map((section, index) => {
        const expanded = expandedSection === section.id;
        return (
          <div key={section.id} className={`overflow-hidden rounded-2xl border transition ${expanded ? "border-cyan-400/30 bg-cyan-400/[0.04]" : "border-white/[0.08] bg-white/[0.025]"}`}>
            <button onClick={() => onToggle(section.id)} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">{section.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">SECTION {String(index + 1).padStart(2, "0")}</span>
                <span className="mt-1 block text-sm font-bold text-zinc-100">{section.title}</span>
              </span>
              {expanded ? <ChevronDown size={18} className="text-cyan-300" /> : <ChevronRight size={18} className="text-zinc-600" />}
            </button>
            {expanded && <div className="border-t border-white/[0.07] px-4 py-4">{section.content}</div>}
          </div>
        );
      })}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-xs leading-relaxed text-zinc-500">
        Guide tip: use these systems together. Career, relationships, cash flow, production, and global growth are connected parts of one long simulation.
      </div>
    </div>
  </div>
);

const GuideView: React.FC<GuideViewProps> = ({ onBack }) => {
  const [mode, setMode] = useState<GuideMode>("MENU");
  const [expandedSection, setExpandedSection] = useState<string | null>("GETTING_STARTED");
  const [wizardStep, setWizardStep] = useState(0);

  const openMode = (nextMode: GuideMode) => {
    setExpandedSection(
      nextMode === "HANDBOOK"
        ? "GETTING_STARTED"
        : nextMode === "PLAYBOOKS"
          ? "EARLY_GAME"
          : nextMode === "FAQ"
            ? "FAQ_ROLES"
            : null
    );
    setMode(nextMode);
  };

  const toggleSection = (id: string) => {
    setExpandedSection((current) => (current === id ? null : id));
  };

  if (mode === "WIZARD") {
    const step = WIZARD_STEPS[wizardStep];
    const isLastStep = wizardStep === WIZARD_STEPS.length - 1;
    return (
      <div className="absolute inset-0 z-40 flex h-full flex-col bg-[#070910] font-sans text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 pb-4 pt-10">
          <button onClick={() => setMode("MENU")} aria-label="Back to guide" className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-300 hover:bg-white/10"><ArrowLeft size={19} /></button>
          <div>
            <div className="text-sm font-black">QUICK START TOUR</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Step {wizardStep + 1} of {WIZARD_STEPS.length}</div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-5">
          <div className={`w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br ${step.color} p-6 sm:p-8`}>
            <div className="mb-8 flex items-center justify-between">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/20">{step.icon}</div>
              <div className="text-right text-[10px] font-black tracking-[0.2em] text-zinc-400">{step.eyebrow}</div>
            </div>
            <h2 className="text-3xl font-black tracking-tight">{step.title}</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">{step.content}</p>
            <div className="mt-8 flex gap-1.5">
              {WIZARD_STEPS.map((item, index) => <div key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= wizardStep ? "bg-cyan-300" : "bg-white/10"}`} />)}
            </div>
            <div className="mt-6 flex gap-3">
              <button disabled={wizardStep === 0} onClick={() => setWizardStep((stepIndex) => Math.max(0, stepIndex - 1))} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
              <button onClick={() => { if (isLastStep) setMode("MENU"); else setWizardStep((stepIndex) => Math.min(WIZARD_STEPS.length - 1, stepIndex + 1)); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
                {isLastStep ? "Finish Tour" : "Next Step"} <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "HANDBOOK") {
    return <SectionList title="Handbook" subtitle="A plain-language reference for the systems, choices, and long-term strategy behind your Industry Globe save." icon={<BookOpen size={20} className="text-amber-300" />} sections={HANDBOOK_SECTIONS} expandedSection={expandedSection} onToggle={toggleSection} onBack={() => setMode("MENU")} />;
  }

  if (mode === "PLAYBOOKS") {
    return <SectionList title="Playbooks" subtitle="Practical strategy guidance for building a stronger career, studio, and global entertainment business." icon={<Activity size={20} className="text-emerald-300" />} sections={PLAYBOOK_SECTIONS} expandedSection={expandedSection} onToggle={toggleSection} onBack={() => setMode("MENU")} />;
  }

  if (mode === "FAQ") {
    return <SectionList title="FAQ" subtitle="Quick answers to common player questions and the most important systems to review when a run slows down." icon={<HelpCircle size={20} className="text-cyan-300" />} sections={FAQ_SECTIONS} expandedSection={expandedSection} onToggle={toggleSection} onBack={() => setMode("MENU")} />;
  }

  const menuCards = [
    { title: "Quick Start Tour", description: "Learn the core loop in five short steps.", detail: "5 STEPS", icon: <PlayCircle size={21} />, color: "text-cyan-300", action: () => { setWizardStep(0); openMode("WIZARD"); } },
    { title: "Handbook", description: "Explore career, finance, production, streaming, and legacy systems.", detail: `${HANDBOOK_SECTIONS.length} TOPICS`, icon: <BookOpen size={21} />, color: "text-amber-300", action: () => openMode("HANDBOOK") },
    { title: "Playbooks", description: "Strategies for momentum, studio planning, money, and expansion.", detail: `${PLAYBOOK_SECTIONS.length} GUIDES`, icon: <Activity size={21} />, color: "text-emerald-300", action: () => openMode("PLAYBOOKS") },
    { title: "FAQ", description: "Troubleshoot common problems and understand key decisions.", detail: `${FAQ_SECTIONS.length} ANSWERS`, icon: <HelpCircle size={21} />, color: "text-violet-300", action: () => openMode("FAQ") },
  ];

  return (
    <div className="absolute inset-0 z-40 flex h-full flex-col overflow-hidden bg-[#070910] font-sans text-white">
      <div className="relative shrink-0 overflow-hidden border-b border-white/[0.08] bg-[#0b0e18] px-5 pb-6 pt-10 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <button onClick={onBack} aria-label="Back" className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-zinc-300 transition hover:bg-white/10"><ArrowLeft size={19} /></button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-lg shadow-cyan-950/20"><Globe size={23} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">INDUSTRY GLOBE</div>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">Player Guide</h1>
          </div>
          <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-[9px] font-black tracking-[0.16em] text-emerald-300 sm:block">CAREER • BUSINESS • LEGACY</div>
        </div>
        <div className="relative mt-7 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200"><Sparkles size={12} /> Your next chapter starts here</div>
          <h2 className="text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl">From rising talent to a <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">global empire.</span></h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">Master the entertainment industry, build your production house, launch new ventures, and create a legacy that lasts.</p>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2">
          {[
            { icon: <Star size={16} />, title: "Build a Career", subtitle: "Talent & fame", color: "text-amber-300" },
            { icon: <Clapperboard size={16} />, title: "Own a Studio", subtitle: "Create IP", color: "text-violet-300" },
            { icon: <Globe size={16} />, title: "Go Global", subtitle: "Reach markets", color: "text-cyan-300" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-black/20 p-3 sm:p-4">
              <div className={`mb-2 ${item.color}`}>{item.icon}</div>
              <div className="text-[11px] font-black text-zinc-100 sm:text-xs">{item.title}</div>
              <div className="mt-1 text-[10px] text-zinc-500">{item.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-24 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">KNOW YOUR SYSTEMS</div>
            <h3 className="mt-1 text-lg font-black">Choose your guide</h3>
          </div>
          <span className="text-[10px] text-zinc-600">PLAYER RESOURCES</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {menuCards.map((card, index) => (
            <button key={card.title} onClick={card.action} className="group rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.045]">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 ${card.color}`}>{card.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black text-white">{card.title}</h4>
                    <ChevronRight size={17} className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{card.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-[9px] font-black tracking-[0.18em] text-zinc-600">{card.detail}</span>
                <span className="text-[10px] font-bold text-cyan-300/80">OPEN GUIDE ↗</span>
              </div>
            </button>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.09] via-[#101321] to-violet-500/[0.08] p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Landmark size={22} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">THE EMPIRE VISION</div>
              <h3 className="mt-1 text-lg font-black">From studio to streamer.</h3>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">Build a catalogue, protect your cash flow, explore distribution, and grow into global markets. Every new business should strengthen the bigger ecosystem.</p>
              <button onClick={() => openMode("HANDBOOK")} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3.5 py-2.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-300/[0.14]">Explore the handbook <ChevronRight size={15} /></button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-700"><CheckCircle2 size={12} /> Plan smart • Build steadily • Think globally</div>
      </div>
    </div>
  );
};

export { GuideView };
