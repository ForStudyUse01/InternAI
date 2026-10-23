"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Briefcase, Check, FileUp, GraduationCap, LineChart, Target } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AiCareerCoachPreviewCard } from "@/components/home/v2/ai-career-coach-preview-card";
import { HeroAmbientDepth } from "@/components/landing/Hero/HeroAmbientDepth";
import { HpCoachPreviewCard } from "@/components/home/v2/hp-coach-preview-card";
import { StoryScrollScene } from "@/components/landing/StoryScroll/StoryScrollScene";
import { SmartAuthLink } from "@/components/navigation/smart-auth-link";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { setupHeroScrollFx } from "@/lib/landing/hero-scroll-timeline";

const REPLAY = { once: false as const };

const TRUST_ITEMS = [
  "AI Resume Analysis",
  "Skill Gap Detection",
  "Smart Internship Matching",
  "Personalized Learning Paths"
] as const;

function HpSection({
  id,
  label,
  title,
  children,
  center = true,
  headerVariant = "fade-up" as const
}: {
  id?: string;
  label: string;
  title: string;
  children: React.ReactNode;
  center?: boolean;
  headerVariant?: "fade-up" | "soft-scale";
}) {
  return (
    <section id={id} className="hp-section">
      <div className={`hp-wrap ${center ? "hp-center" : ""}`}>
        <ScrollReveal variant={headerVariant} distance={10} {...REPLAY}>
          <p className="hp-label">{label}</p>
          <h2 className="hp-title mt-2">{title}</h2>
        </ScrollReveal>
        {children}
      </div>
    </section>
  );
}

export function HomepageHero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = hero.querySelector<HTMLElement>(".hp-preview-3d-scene");
    const headline = hero.querySelector<HTMLElement>(".hp-hero-headline");
    if (!card || !headline) return;

    const glow = hero.querySelector<HTMLElement>(".hp-preview-3d-glow");
    const ambient = hero.querySelector<HTMLElement>(".hp-hero-ambient-canvas");

    return setupHeroScrollFx({ heroSection: hero, card, headline, glow, ambient });
  }, []);

  return (
    <section id="hero" className="hp-hero" ref={heroRef}>
      <div className="hp-hero-inner">
        <div className="hp-hero-copy">
          <ScrollReveal variant="soft-scale" distance={12} {...REPLAY}>
            <p className="hp-hero-eyebrow">{BRAND_NAME}</p>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" distance={14} delayMs={60} {...REPLAY}>
            <h1 className="hp-hero-headline">
              The <span className="hp-hero-headline-accent">AI-Powered</span> Platform
              Connecting Talented Interns with Forward-Thinking Companies
            </h1>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" distance={10} delayMs={120} {...REPLAY}>
            <div className="hp-hero-lines">
              <p>{BRAND_TAGLINE}</p>
              <p>Career acceleration for interns.</p>
              <p>Smarter hiring for companies.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="stagger-children" distance={8} delayMs={180} staggerMs={70} {...REPLAY}>
            <div className="hp-actions hp-actions--left">
              <Link href="/auth" className="hp-btn hp-btn-primary hp-btn-lg">
                Get Started
              </Link>
              <Link href="#how-it-works" className="hp-btn hp-btn-ghost hp-btn-lg">
                Explore Platform
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" distance={8} delayMs={280} {...REPLAY}>
            <ul className="hp-trust" aria-label="Platform highlights">
              {TRUST_ITEMS.map((item) => (
                <li key={item}>
                  <Check className="hp-trust-icon" strokeWidth={2.5} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>

        <ScrollReveal variant="slide-right" distance={16} delayMs={200} {...REPLAY} className="hp-hero-preview-wrap">
          <HeroAmbientDepth />
          <AiCareerCoachPreviewCard />
        </ScrollReveal>
      </div>
    </section>
  );
}

const STEPS = [
  { num: "01", label: "Upload Resume", icon: FileUp },
  { num: "02", label: "Analyze Skills", icon: LineChart },
  { num: "03", label: "Match Opportunities", icon: Target }
] as const;

export function HomepageStoryScroll() {
  return (
    <StoryScrollScene id="how-it-works" label="Process" title={`How ${BRAND_NAME} works`}>
      <div className="hp-steps">
        {STEPS.map((step) => (
          <div key={step.num} className="hp-step hp-surface hp-surface--interactive">
            <span className="hp-step-num">{step.num}</span>
            <div className="hp-step-icon">
              <step.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <h3>{step.label}</h3>
          </div>
        ))}
      </div>
    </StoryScrollScene>
  );
}

const CAPABILITIES = [
  {
    title: "Resume Intelligence",
    description: "ATS-aware scoring and recruiter-ready insights."
  },
  {
    title: "Skill Gap Analysis",
    description: "Targeted gaps mapped to role requirements."
  },
  {
    title: "Smart Internship Matching",
    description: "AI-ranked opportunities aligned to your profile."
  },
  {
    title: "Learning Recommendations",
    description: "Curated paths to close gaps faster."
  }
] as const;

export function HomepageCapabilities() {
  return (
    <HpSection id="capabilities" label="Platform" title="Platform capabilities">
      <div className="hp-reveal-zone">
        <ScrollReveal
          variant="stagger-children"
          className="hp-grid-4"
          distance={8}
          staggerMs={90}
          threshold={0.12}
          {...REPLAY}
        >
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="hp-cap-cell hp-surface hp-surface--interactive">
              <p className="hp-cap-title">{cap.title}</p>
              <p className="hp-cap-desc">{cap.description}</p>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </HpSection>
  );
}

export function HomepageAudience() {
  return (
    <HpSection id="audience" label="For everyone" title="For students & companies">
      <div className="hp-split">
        <ScrollReveal variant="slide-left" distance={14} threshold={0.2} {...REPLAY}>
          <div className="hp-surface hp-split-panel hp-surface--interactive">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[var(--hp-muted)]" strokeWidth={1.5} aria-hidden />
              <h3>Students</h3>
            </div>
            <ul className="hp-list">
              <li>Improve resume</li>
              <li>Find internships</li>
              <li>Learn relevant skills</li>
            </ul>
            <SmartAuthLink intendedRole="intern" className="hp-btn hp-btn-primary mt-6">
              For Students
            </SmartAuthLink>
          </div>
        </ScrollReveal>
        <ScrollReveal variant="slide-right" distance={14} delayMs={80} threshold={0.2} {...REPLAY}>
          <div className="hp-surface hp-split-panel hp-surface--interactive">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[var(--hp-muted)]" strokeWidth={1.5} aria-hidden />
              <h3>Companies</h3>
            </div>
            <ul className="hp-list">
              <li>Discover candidates</li>
              <li>Evaluate skills</li>
              <li>Hire faster</li>
            </ul>
            <SmartAuthLink intendedRole="company" className="hp-btn hp-btn-primary mt-6">
              For Companies
            </SmartAuthLink>
          </div>
        </ScrollReveal>
      </div>
    </HpSection>
  );
}

export function HomepageCoachPreview() {
  return (
    <HpSection id="coach" label="AI coach" title="Career intelligence preview">
      <ScrollReveal variant="soft-scale" distance={12} threshold={0.15} {...REPLAY}>
        <HpCoachPreviewCard score={78} />
      </ScrollReveal>
    </HpSection>
  );
}

export function HomepageFinalCta() {
  return (
    <section className="hp-section hp-cta">
      <div className="hp-wrap hp-center">
        <ScrollReveal variant="fade-up" distance={12} threshold={0.25} {...REPLAY}>
          <h2 className="hp-title hp-cta-title">Ready to accelerate your career?</h2>
          <ScrollReveal variant="stagger-children" distance={8} delayMs={120} staggerMs={80} {...REPLAY}>
            <div className="hp-actions mt-8">
              <Link href="/auth" className="hp-btn hp-btn-primary hp-btn-lg">
                Start Free
              </Link>
              <Link href="#capabilities" className="hp-btn hp-btn-ghost hp-btn-lg">
                Learn More
              </Link>
            </div>
          </ScrollReveal>
        </ScrollReveal>
      </div>
    </section>
  );
}
