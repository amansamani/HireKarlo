import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, Check, Fingerprint, HeartHandshake, Layers3, MoveUpRight, SearchCheck, Sparkles, Target, TrendingUp, Users, UserCheck, Quote } from "lucide-react";
import LandingMotion from "@/components/landing/landing-motion";
import WorkflowPreview from "@/components/landing/workflow-preview";
import FloatingAvatars from "@/components/landing/floating-avatars";
import AnimatedStats from "@/components/landing/animated-stats";
import { CookieSettingsButton } from "@/components/privacy/cookie-settings-button";
const personas = [
  { icon: UserCheck, title: "In-House Recruiters", description: "Manage your pipeline, track candidates, and collaborate with hiring managers in one clean workspace.", tag: "Most popular", color: "from-emerald-400 to-teal-600" },
  { icon: Building2, title: "Recruitment Agencies", description: "Handle multiple clients, manage candidate pools across jobs, and impress with professional reporting.", tag: "Growing fast", color: "from-blue-400 to-indigo-600" },
  { icon: BriefcaseBusiness, title: "Hiring Managers", description: "Review shortlists, give structured feedback, and make data-informed decisions without the noise.", tag: "Team favorite", color: "from-purple-400 to-pink-600" },
  { icon: HeartHandshake, title: "HR Teams", description: "Standardize your interview process, keep compliance records, and scale your hiring consistently.", tag: "Enterprise ready", color: "from-amber-400 to-orange-600" },
];

const features = [
  { icon: BriefcaseBusiness, number: "01", title: "A home for every opening.", text: "Create a role, choose your interview stages and share a public application link. Keep incoming applications connected to the right job.", tag: "Jobs" },
  { icon: Sparkles, number: "02", title: "More context. Better reviews.", text: "Bring resumes, candidate profiles and optional AI screening into the same view. Let your team make an informed, human decision.", tag: "AI-powered" },
  { icon: CalendarDays, number: "03", title: "A team that stays in sync.", text: "Assign interviewers, schedule conversations and capture scorecards. Stop losing the details between a good interview and the next step.", tag: "Collaboration" },
  { icon: Target, number: "04", title: "Track every decision.", text: "Audit history, billing transparency, and team permissions. Know who did what, when — and why.", tag: "Accountability" },
  { icon: TrendingUp, number: "05", title: "Built to scale with you.", text: "From your first hire to managing a 50-person team. Plans that grow without losing what made you efficient.", tag: "Growth" },
  { icon: Users, number: "06", title: "Invite your whole team.", text: "Owners, admins, recruiters, interviewers. Each role has the right access and the right context.", tag: "Teamwork" },
];

const testimonials = [
  { quote: "HireKarlo replaced three tools for us. Our agency runs 40+ openings without a single spreadsheet.", name: "Marcus Reyes", role: "CEO, TalentBridge Agency", initials: "MR", color: "from-blue-400 to-indigo-600" },
  { quote: "I can review a candidate with full context — resume, AI score, and interviewer notes — in under 30 seconds.", name: "Sarah Kim", role: "HR Director, Acme Labs", initials: "SK", color: "from-emerald-400 to-teal-600" },
  { quote: "Finally, an ATS that doesn't feel like it was designed in 2009. My team actually enjoys using it.", name: "Aisha Noor", role: "Head of Talent, Nova Studio", initials: "AN", color: "from-rose-400 to-fuchsia-600" },
];

export default function Home() {
  return <LandingMotion>
    <a href="#content" className="skip-link rounded-lg bg-primary px-4 py-3 text-primary-foreground">Skip to content</a>

    <header className="marketing-section flex min-h-24 items-center justify-between gap-4 border-b border-white/10 relative z-50">
      <Link href="/" className="flex items-center gap-2.5" aria-label="HireKarlo home">
  <Image
    src="/logo.webp"
    alt="HireKarlo logo"
    width={36}
    height={36}
    className="size-9 object-contain"
    priority
  />
  <span className="font-display text-xl font-semibold tracking-tight">
    HireKarlo<span className="text-primary">.</span>
  </span>
</Link>
      <nav className="motion-nav hidden items-center gap-7 text-xs text-muted-foreground md:flex" aria-label="Product navigation">
        <a href="#personas" className="hover:text-white">{"Who it's for"}</a>
        <a href="#workflow" className="hover:text-white">The workflow</a>
        <a href="#features" className="hover:text-white">Why HireKarlo</a>
        <Link href="/pricing" className="hover:text-white">Plans</Link>
        <Link href="/track" className="hover:text-white">Track application</Link>
      </nav>
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-xs text-muted-foreground hover:text-white">Log in</Link>
        <Link href="/register" className="hidden min-h-10 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/10 sm:inline-flex">
          Get started
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </header>

    <main id="content">
      {/* HERO - Premium Editorial Style */}
{/* HERO */}
<section className="relative min-h-[90vh] flex items-center pt-10 pb-16 sm:pt-16 sm:pb-24">
  {/* Background layers live in their OWN clipped wrapper — content can never be cut */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 hero-grid opacity-30" />
    <div className="hero-ambient" />
    <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.08] blur-[120px]" />
  </div>

  <div className="marketing-section relative py-10 sm:py-16 w-full">
    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-8">
      <div className="relative z-10">
        <div className="hero-intro inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 backdrop-blur-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="text-xs font-medium text-primary tracking-wide">Elevate Your Hiring</span>
        </div>

        {/* Sized so "Great people." stays on ONE line and nothing clips */}
        <h1 className="mt-7 font-display font-normal leading-[1.04] tracking-[-.02em] text-[clamp(2.5rem,5.6vw,5.5rem)]">
          <span className="hero-line block">
            <span><span className="italic text-primary">Great</span> people.</span>
          </span>
          <span className="hero-line block">
            <span className="text-gradient">Less process.</span>
          </span>
          <span className="hero-line block">
            <span className="font-hand italic text-primary text-[1.15em]">More hiring.</span>
          </span>
        </h1>

        <p className="hero-copy mt-7 max-w-lg text-base leading-8 text-[#a9afa3] sm:text-lg">
          The workspace built for teams who appreciate the finer details of hiring.
          Organize candidates, run interviews, and close roles with
          <span className="font-hand text-primary italic text-xl"> elegance.</span>
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/register" className="motion-cta group inline-flex min-h-12 items-center gap-3 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-[0_8px_30px_rgb(184,237,101,0.3)]">
            Create your workspace
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <a href="#workflow" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-6 text-sm font-medium hover:bg-white/10 transition-colors">
            See how it works
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-8 flex items-center gap-6">
          <div className="flex -space-x-2">
            {["from-emerald-400 to-teal-600", "from-blue-400 to-indigo-600", "from-purple-400 to-pink-600", "from-amber-400 to-orange-600"].map((g, i) => (
              <div key={i} className={`size-9 rounded-full bg-gradient-to-br ${g} border-2 border-[#0a0c09] flex items-center justify-center text-white text-[11px] font-bold`}>
                {["SK", "MR", "LP", "JT"][i]}
              </div>
            ))}
            <div className="size-9 rounded-full bg-white/10 border-2 border-[#0a0c09] flex items-center justify-center text-[10px] font-semibold">+2k</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => <span key={i} className="text-amber-400 text-sm">★</span>)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Loved by 12,000+ recruiters</p>
          </div>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground flex items-center gap-2">
          <Check className="size-3 text-primary" aria-hidden="true" />
          14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>

      <div className="relative h-[420px] sm:h-[500px] lg:h-[560px]" data-parallax="0.3">
        <FloatingAvatars />
      </div>
    </div>

    <div data-reveal="120" className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-[11px] tracking-wide text-muted-foreground">
      {["Built for in-house recruiters", "Agency-ready workspaces", "Human decisions, always", "SOC 2 compliant"].map(text => (
        <span className="flex items-center gap-2" key={text}>
          <Check className="size-3.5 text-primary" aria-hidden="true" />
          {text}
        </span>
      ))}
    </div>
  </div>
</section>

      <AnimatedStats />

      {/* PERSONAS */}
      <section id="personas" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none -translate-y-1/2" aria-hidden="true" />
        <div className="marketing-section relative">
          <div className="scroll-reveal text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow mb-4">Built for your role</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-.035em] leading-tight">
              Whether you&apos;re a solo recruiter
              <br />
              or running an <span className="font-hand italic text-primary">agency</span>
            </h2>
            <p className="mt-5 text-base text-muted-foreground">HireKarlo adapts to how you hire. Choose the workspace that fits your team.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 perspective-1500">
            {personas.map(({ icon: Icon, title, description, tag, color }, index) => (
              <article key={title} className="scroll-reveal tilt-card" data-tilt="8" style={{ transitionDelay: `${index * 80}ms` }}>
                <div className="tilt-bg relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 h-full hover:border-primary/30 transition-colors overflow-hidden">
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                      <span className="size-1 rounded-full bg-primary" />{tag}
                    </span>
                  </div>
                  <div className={`tilt-front relative size-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="size-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="tilt-inner">
                    <h3 className="font-display text-xl font-semibold tracking-tight mb-3">{title}</h3>
                    <p className="text-sm leading-7 text-muted-foreground">{description}</p>
                    <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-2 text-xs font-medium text-primary group-hover:gap-3 transition-all">
                      Learn more<ArrowRight className="size-3.5" />
                    </div>
                  </div>
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW - Immersive Preview */}
<section data-reveal="0" id="workflow" className="marketing-section scroll-mt-8 pb-20 sm:pb-28 relative overflow-hidden">
  {/* Background enhancement */}
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" aria-hidden="true" />
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" aria-hidden="true" />
  
  <div className="relative">
    <div className="scroll-reveal text-center max-w-2xl mx-auto mb-12">
      <p className="eyebrow mb-4">The workflow</p>
      <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal leading-[0.95] tracking-[-.02em]">
        See the <span className="font-hand italic text-primary text-6xl lg:text-7xl">whole picture</span>
      </h2>
      <p className="mt-5 text-base text-muted-foreground">From application to offer, every stage of hiring stays connected in one calm workspace.</p>
    </div>
    
    {/* Enhanced WorkflowPreview wrapper */}
    <div className="scroll-reveal perspective-1500">
      <div className="relative rounded-3xl overflow-hidden shimmer-border" data-tilt="3">
        <WorkflowPreview />
        {/* Premium overlay effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0a0c09]/20 to-transparent" aria-hidden="true" />
      </div>
    </div>
  </div>
</section>

      {/* FEATURES */}
      <section id="features" className="relative border-y border-white/10 bg-[#0d100b] py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
          <div className="absolute top-20 right-20 size-64 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-20 left-20 size-72 rounded-full bg-blue-500/10 blur-[120px]" />
        </div>
        <div className="marketing-section relative">
          <div className="scroll-reveal flex flex-col justify-between gap-6 sm:flex-row sm:items-end mb-14">
            <div>
              <p className="eyebrow mb-4">Made for the work that matters</p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-[-.035em]">
                Less chasing updates.<br /><span className="text-gradient">More moving forward.</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-7 text-muted-foreground">Your pipeline, your people and your next steps. Connected from the beginning.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 perspective-1500">
            {features.map(({ icon: Icon, number, title, text, tag }, index) => (
              <article key={number} data-spotlight data-reveal={index * 80} data-tilt="5" className="scroll-reveal tilt-card motion-card" style={{ transitionDelay: `${index * 60}ms` }}>
                <div className="tilt-bg group relative h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-7 hover:border-primary/30">
                  <div className="tilt-front mb-8 flex items-center justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" strokeWidth={1.5} />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">/{number}</span>
                  </div>
                  <div className="tilt-inner">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground mb-3">{tag}</span>
                    <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WORKSPACE DETAILS */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="marketing-section">
          <div className="scroll-reveal grid gap-12 lg:grid-cols-2 lg:gap-24 lg:items-center">
            <div>
              <p className="eyebrow mb-4">Clarity at every level</p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-[-.035em]">
                Your process.<br />A shared <span className="font-hand italic text-primary">perspective.</span>
              </h2>
              <p className="mt-6 max-w-md text-base leading-8 text-muted-foreground">
                A growing team needs more than a spreadsheet. HireKarlo gives everyone the context to do their part, with access shaped around their role.
              </p>
              <Link href="/pricing" className="mt-7 inline-flex items-center gap-3 border-b border-primary/40 pb-2 text-sm text-primary hover:border-primary transition-colors">
                Find your workspace plan<MoveUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="space-y-2 perspective-1000">
              {[
                { icon: Layers3, title: "One workspace, organized", text: "Jobs, candidate records and agency clients stay connected within their organization." },
                { icon: Users, title: "The right people in the room", text: "Owners, admins, recruiters and interviewers each have defined permissions." },
                { icon: Fingerprint, title: "A history you can follow", text: "Review recorded workspace changes in audit history and track plan usage in billing." }
              ].map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="scroll-reveal motion-detail group flex gap-5 border-b border-white/10 py-6 hover:pl-2 transition-all duration-300" style={{ transitionDelay: `${index * 100}ms` }}>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
                    <Icon className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.05] blur-[120px] pointer-events-none" aria-hidden="true" />
        <div className="marketing-section relative">
          <div className="scroll-reveal text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow mb-4">Loved by hiring teams</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-.035em] leading-tight">
              Real recruiters.<br /><span className="font-hand italic text-primary">Real results.</span>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3 perspective-1500">
            {testimonials.map(({ quote, name, role, initials, color }, index) => (
              <figure key={name} className="scroll-reveal tilt-card" data-tilt="6" style={{ transitionDelay: `${index * 100}ms` }}>
                <div className="tilt-bg relative h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-7">
                  <Quote className="size-8 text-primary/40 mb-5" strokeWidth={1} />
                  <blockquote className="tilt-front text-base leading-7 text-foreground/90 font-display font-medium tracking-tight">&ldquo;{quote}&rdquo;</blockquote>
                  <figcaption className="tilt-inner mt-6 pt-6 border-t border-white/10 flex items-center gap-3">
                    <div className={`size-11 shrink-0 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>{initials}</div>
                    <div>
                      <p className="text-sm font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground">{role}</p>
                    </div>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="marketing-section pb-20">
        <div className="scroll-reveal perspective-1500">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#a5e85a] to-[#7fd63f] px-6 py-16 text-[#182111] sm:px-16 sm:py-20">
            <div className="absolute top-0 right-0 size-64 rounded-full bg-white/20 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 size-48 rounded-full bg-white/20 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true" />
            <div className="relative grid gap-10 md:grid-cols-[1.5fr_1fr] md:items-end">
              <div>
                <p className="font-hand italic text-2xl text-[#182111]/80 mb-3">Your next great hire is waiting.</p>
                <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-[-.04em]">
                  Build a team.<br />Enjoy the <span className="italic font-hand">process.</span>
                </h2>
                <p className="mt-5 max-w-md text-base text-[#182111]/70">Join 12,000+ recruiters and hiring teams who&apos;ve made hiring feel human again.</p>
              </div>
              <div>
                <Link href="/register" className="motion-cta inline-flex min-h-14 w-full items-center justify-between gap-12 rounded-full bg-[#182111] px-8 text-base font-semibold text-white hover:bg-[#293b1c] shadow-2xl transition-all">
                  Start hiring free<ArrowUpRight className="size-5" aria-hidden="true" />
                </Link>
                <Link href="/track" className="mt-6 flex items-center gap-2 text-xs text-[#182111]/70 hover:text-[#182111] transition-colors">
                  <SearchCheck className="size-4" aria-hidden="true" />Already applied? Track your application
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer className="marketing-section border-t border-white/10 py-12">
      <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="HireKarlo home">
  <Image
    src="/logo.webp"
    alt="HireKarlo logo"
    width={28}
    height={28}
    className="size-7 object-contain"
  />
  <span className="font-display text-xl font-bold tracking-tight">
    HireKarlo<span className="text-primary">.</span>
  </span>
</Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">Built by Aman Samani. A personal SaaS portfolio project for modern hiring teams.</p>
          <div className="mt-5 flex -space-x-2">
            {["from-emerald-400 to-teal-600", "from-blue-400 to-indigo-600", "from-purple-400 to-pink-600"].map((g, i) => (
              <div key={i} className={`size-7 rounded-full bg-gradient-to-br ${g} border-2 border-[#0a0c09] flex items-center justify-center text-white text-[9px] font-bold`}>{["SK", "MR", "LP"][i]}</div>
            ))}
            <div className="size-7 rounded-full bg-white/10 border-2 border-[#0a0c09] flex items-center justify-center text-[8px] font-semibold">+2k</div>
          </div>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-4">Product</h4>
          <nav className="flex flex-col gap-3 text-sm text-muted-foreground">
            <a href="#workflow" className="hover:text-white">The workflow</a>
            <a href="#features" className="hover:text-white">Features</a>
            <Link href="/pricing" className="hover:text-white">Plans & pricing</Link>
            <Link href="/track" className="hover:text-white">Track application</Link>
          </nav>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-4">For teams</h4>
          <nav className="flex flex-col gap-3 text-sm text-muted-foreground">
            <a href="#personas" className="hover:text-white">In-house recruiters</a>
            <a href="#personas" className="hover:text-white">Recruitment agencies</a>
            <a href="#personas" className="hover:text-white">Hiring managers</a>
            <a href="#personas" className="hover:text-white">HR teams</a>
          </nav>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-4">Company</h4>
          <nav className="flex flex-col gap-3 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/cookies" className="hover:text-white">Cookies</Link>
          </nav>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 text-xs text-muted-foreground">
  <p>© {new Date().getFullYear()} HireKarlo. All rights reserved.</p>
  <div className="flex items-center gap-6">
    <CookieSettingsButton />
    <p>Made with <span className="font-hand italic text-primary">care</span> for recruiters worldwide.</p>
  </div>
</div>
    </footer>
  </LandingMotion>;
}