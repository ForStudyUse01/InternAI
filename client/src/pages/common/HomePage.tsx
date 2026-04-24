import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, Variants, useMotionEvent } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bot,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  Mail,
  Menu,
  Minus,
  Plus,
  Send,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/constants";
import { EnergyStreamBackground } from "@/components/ui/EnergyStreamBackground";
import { Hero3DCard } from "@/components/ui/Hero3DCard";
import { AnimatedCounter } from "@/components/ui/ReactiveGlow";

const sectionIds = {
  features: "features",
  workflow: "workflow",
  dashboards: "dashboards",
  faq: "faq",
} as const;

const navItems = [
  { label: "Features", href: `#${sectionIds.features}` },
  { label: "How It Works", href: `#${sectionIds.workflow}` },
  { label: "Dashboards", href: `#${sectionIds.dashboards}` },
  { label: "FAQ", href: `#${sectionIds.faq}` },
];

const features = [
  {
    icon: Sparkles,
    title: "Resume Analysis",
    description:
      "AI reviews your resume, surfaces weak spots, and gives you a clearer path to stronger applications.",
  },
  {
    icon: Target,
    title: "Smart Matching",
    description:
      "Students get internship recommendations based on skills, interests, and hiring fit instead of guesswork.",
  },
  {
    icon: BarChart3,
    title: "Application Tracking",
    description:
      "Follow every application from submission to interview in one place with useful status visibility.",
  },
  {
    icon: Briefcase,
    title: "Recruiter Workflow",
    description:
      "Companies can review, compare, and shortlist applicants faster with AI-assisted candidate scoring.",
  },
];

const workflowSteps = [
  { icon: FileText, label: "Upload Resume" },
  { icon: Bot, label: "AI Analysis" },
  { icon: Target, label: "Smart Matching" },
  { icon: Send, label: "Apply" },
  { icon: Briefcase, label: "Track Progress" },
];

const testimonials = [
  {
    name: "Emily Rodriguez",
    role: "Software Engineering Intern",
    company: "TechCorp",
    quote:
      "InternAI helped me focus on the roles that actually matched my profile. I got interviews much faster.",
  },
  {
    name: "Marcus Chen",
    role: "Hiring Manager",
    company: "DataLabs",
    quote:
      "The ranking and shortlist flow saves our team hours every week and makes screening much more consistent.",
  },
  {
    name: "Sarah Johnson",
    role: "ML Research Intern",
    company: "CloudSys",
    quote:
      "The resume insights made it obvious what to improve, and the recommendations felt relevant right away.",
  },
];

const faqs = [
  {
    question: "How does the AI resume analysis work?",
    answer:
      "The platform evaluates resume content, skills, and presentation, then highlights where a student profile can better align with internship requirements.",
  },
  {
    question: "Is InternAI free for students?",
    answer:
      "Students can get started without cost, while recruiter-focused workflow features can be expanded separately for company use.",
  },
  {
    question: "Can companies track applicants in real time?",
    answer:
      "Yes. Recruiters can review candidate progress, monitor status changes, and compare applicants from a single dashboard.",
  },
  {
    question: "Who should use this platform?",
    answer:
      "It is built for both students searching for internships and companies managing application pipelines.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

function resolvePrimaryHref(userRole: "intern" | "company" | null) {
  if (userRole === "intern") {
    return "/intern/dashboard";
  }

  if (userRole === "company") {
    return "/company/dashboard";
  }

  return "/auth/signup";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function HomePage() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const primaryHref = resolvePrimaryHref(user?.role ?? null);
  const dashboardHref = user?.role === "company" ? "/company/dashboard" : "/intern/dashboard";

  const { scrollY } = useScroll();
  const heroBgY = useTransform(scrollY, [0, 1000], [0, 400]);
  const heroTextY = useTransform(scrollY, [0, 800], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 300, 700], [1, 1, 0]);
  const heroScale = useTransform(scrollY, [0, 300, 700], [1, 1, 0.9]);

  const containerReveal: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemReveal: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(12px)", scale: 0.95 },
    show: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, transition: { duration: 0.8, ease } },
  };

  const slideUp: Variants = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <div className="relative overflow-hidden">
        <motion.div style={{ y: heroBgY, willChange: "transform" }} className="absolute inset-0 pointer-events-none">
          <EnergyStreamBackground />
        </motion.div>

        <header className="relative z-20 px-4 pt-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
            <Link to="/" className="bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-xl font-bold text-transparent">
              {APP_NAME}
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="text-sm text-white/75 transition-colors hover:text-white">
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              {!user ? (
                <>
                  <Link
                    to="/auth/login"
                    className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    to={primaryHref}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00FF88] to-[#00E0FF] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_16px_40px_rgba(0,255,136,0.24)] transition-transform hover:scale-[1.02]"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={dashboardHref}
                    className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:border-white/25 hover:bg-white/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileOpen ? (
            <div className="mx-auto mt-3 max-w-7xl rounded-[24px] border border-white/10 bg-[#0f0820]/95 px-5 py-5 backdrop-blur-xl md:hidden">
              <div className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-white/75 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-4">
                  {!user ? (
                    <>
                      <Link
                        to="/auth/login"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full border border-white/10 px-4 py-3 text-center text-sm font-medium text-white/85"
                      >
                        Sign In
                      </Link>
                      <Link
                        to={primaryHref}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full bg-gradient-to-r from-[#00FF88] to-[#00E0FF] px-4 py-3 text-center text-sm font-semibold text-black"
                      >
                        Get Started
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to={dashboardHref}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full border border-white/10 px-4 py-3 text-center text-sm font-medium text-white/85"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                        }}
                        className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <motion.section 
          className="relative z-10 mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20"
          style={{ opacity: heroOpacity, scale: heroScale, y: heroTextY, willChange: "transform, opacity" }}
        >
          <motion.div
            variants={containerReveal}
            initial="hidden"
            animate="show"
            className="flex flex-col items-start"
          >
            <motion.div variants={itemReveal} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#00FF88]/25 bg-white/5 px-4 py-2 text-sm text-white/85 backdrop-blur-sm self-start shadow-[0_0_20px_rgba(0,255,136,0.1)]">
              <Sparkles className="h-4 w-4 text-[#00FF88]" />
              AI-powered internship platform
            </motion.div>
            <motion.div variants={itemReveal} className="overflow-hidden">
              <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Find the right internship
                <span className="block bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-transparent">
                  faster and smarter
                </span>
              </h1>
            </motion.div>
            <motion.p variants={itemReveal} className="mt-6 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              Connect students with better internship opportunities and help recruiters move from screening to hiring with less friction.
            </motion.p>

            <motion.div variants={itemReveal} className="mt-10 flex flex-wrap gap-4">
              <Link
                to={primaryHref}
                className="inline-flex min-w-[240px] items-center justify-center rounded-[20px] bg-gradient-to-r from-[#00E58D] to-[#12CBE2] px-8 py-5 text-lg font-semibold text-black shadow-[0_24px_50px_rgba(0,255,136,0.24)] transition-all hover:scale-[1.04] hover:shadow-[0_32px_60px_rgba(0,255,136,0.4)]"
              >
                Get Started
              </Link>
            </motion.div>

            <motion.div variants={containerReveal} className="mt-12 grid gap-5 sm:grid-cols-3 w-full">
              {[
                { label: "AI Match Score", value: "98%" },
                { label: "Average Time Saved", value: "12 hrs" },
                { label: "Screening Efficiency", value: "4.2x" },
              ].map((stat) => (
                <motion.div variants={itemReveal} key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:border-[#00FF88]/50 hover:bg-white/10 group">
                  <div className="text-2xl font-bold text-[#00FF88] group-hover:drop-shadow-[0_0_12px_rgba(0,255,136,0.8)] transition-all">{stat.value}</div>
                  <div className="mt-2 text-sm text-white/55 group-hover:text-white/85 transition-colors">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <Hero3DCard>
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-lg font-semibold text-white">Resume Analysis</p>
                <p className="mt-1 text-sm text-white/55">Live applicant insight panel</p>
              </div>
              <div className="rounded-full border border-[#00FF88]/30 bg-[#00FF88]/10 px-3 py-1 text-sm text-[#00FF88]">
                Active
              </div>
            </div>

            <div 
              className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 relative"
              style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }}
            >
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-white">87</span>
                <span className="pb-2 text-white/45">/100</span>
              </div>
              <p className="mt-2 text-sm text-white/55">Your current match score</p>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div className="h-2 w-[87%] rounded-full bg-gradient-to-r from-[#00FF88] to-[#00E0FF]" />
              </div>
            </div>

            <div 
              className="mt-6 space-y-3 relative"
              style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
            >
              {[
                { company: "TechCorp", role: "Software Engineer Intern", match: "92%" },
                { company: "DataLabs", role: "ML Research Intern", match: "89%" },
                { company: "CloudSys", role: "Backend Developer", match: "85%" },
              ].map((job) => (
                <div
                  key={job.company}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition-transform hover:scale-[1.02]"
                >
                  <div>
                    <div className="font-medium text-white">{job.company}</div>
                    <div className="text-sm text-white/50">{job.role}</div>
                  </div>
                  <div className="text-sm font-semibold text-[#00FF88]">{job.match}</div>
                </div>
              ))}
            </div>
          </Hero3DCard>
        </motion.section>
      </div>

      <main className="relative">
        <section id={sectionIds.features} className="relative overflow-hidden px-4 py-24 sm:px-6" style={{ perspective: "1200px" }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,#010d0a_50%,#000000_100%)]" />
          <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00FF88]/[0.03] blur-[160px]" />
          <div className="relative mx-auto max-w-7xl">
            <motion.div 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              variants={containerReveal}
              className="mx-auto max-w-2xl text-center"
            >
              <motion.p variants={itemReveal} className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00FF88]/80">Features</motion.p>
              <div className="overflow-hidden mt-4">
                <motion.h2 variants={slideUp} className="text-4xl font-bold sm:text-5xl">
                  Everything you need to
                  <span className="block bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-transparent">
                    move with confidence
                  </span>
                </motion.h2>
              </div>
              <motion.p variants={itemReveal} className="mt-5 text-lg text-white/60">
                A cleaner workflow for students and recruiters, built around fit, speed, and visibility.
              </motion.p>
            </motion.div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4" style={{ transformStyle: "preserve-3d" }}>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 50, rotateX: 25, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                    whileHover={{ y: -10, scale: 1.04, rotateX: -3, transition: { duration: 0.25, ease: "easeOut" } }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, delay: index * 0.1, ease }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="group relative rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-colors hover:border-[#00FF88]/40 hover:bg-white/10 hover:shadow-[0_20px_40px_rgba(0,255,136,0.15)] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/0 to-[#00FF88]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative z-10 inline-flex rounded-2xl bg-gradient-to-r from-[#00FF88] to-[#00E0FF] p-3 text-black shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/60">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id={sectionIds.workflow} className="relative overflow-hidden px-4 py-24 sm:px-6" style={{ perspective: "1200px" }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,#010806_100%)]" />
          <div className="relative mx-auto max-w-6xl">
            <motion.div 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              variants={containerReveal}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.p variants={itemReveal} className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/80">How it works</motion.p>
              <div className="overflow-hidden mt-4">
                <motion.h2 variants={slideUp} className="text-4xl font-bold sm:text-5xl">
                  From resume upload to
                  <span className="block bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-transparent">
                    internship outcomes
                  </span>
                </motion.h2>
              </div>
              <motion.p variants={itemReveal} className="mt-5 text-lg text-white/60">
                The landing flow is now connected to the real app routes, so this CTA path leads into your existing auth and dashboard pages.
              </motion.p>
            </motion.div>

            <div className="relative mt-16 grid gap-8 md:grid-cols-5" style={{ transformStyle: "preserve-3d" }}>
              <div className="absolute left-0 right-0 top-8 hidden h-px overflow-hidden bg-white/10 md:block">
                <motion.div
                  className="absolute inset-y-0 w-[40%] bg-gradient-to-r from-transparent via-[#00FF88] to-transparent"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-y-0 w-[40%] bg-gradient-to-r from-transparent via-[#00E0FF] to-transparent"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
                />
              </div>
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, y: 30, rotateY: -15, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                    whileHover={{ scale: 1.08, rotateY: 8, z: 30, transition: { duration: 0.25, ease: "easeOut" } }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: index * 0.1, ease }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="relative flex flex-col items-center text-center group"
                  >
                    <div className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-[#101624] shadow-[0_0_40px_rgba(0,255,136,0.10)] transition-all duration-300 group-hover:scale-110 group-hover:border-[#00FF88]/40 group-hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]">
                      <Icon className="h-7 w-7 text-[#00FF88]" />
                    </div>
                    <div className="mt-5 text-base font-semibold text-white group-hover:text-[#00FF88] transition-colors">{step.label}</div>
                    <div className="mt-1 text-sm text-white/45">Step {index + 1}</div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-14 text-center">
              <Link
                to={primaryHref}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00FF88] to-[#00E0FF] px-7 py-3.5 font-semibold text-black transition-transform hover:scale-[1.02]"
              >
                Start Your Journey
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id={sectionIds.dashboards} className="relative overflow-hidden px-4 py-24 sm:px-6" style={{ perspective: "1400px" }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#010806_0%,#001a12_50%,#000000_100%)]" />
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-400/10 blur-[160px]" />
          <div className="relative mx-auto max-w-7xl">
            <motion.div 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              variants={containerReveal}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.p variants={itemReveal} className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00FF88]/80">Dashboards</motion.p>
              <div className="overflow-hidden mt-4">
                <motion.h2 variants={slideUp} className="text-4xl font-bold sm:text-5xl">Built for students and recruiters</motion.h2>
              </div>
              <motion.p variants={itemReveal} className="mt-5 text-lg text-white/60">
                Both sides of the platform get a focused workflow instead of a generic job board experience.
              </motion.p>
            </motion.div>

            <motion.div 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              variants={containerReveal}
              className="mt-14 grid gap-8 lg:grid-cols-2"
            >
              <motion.div variants={itemReveal} whileHover={{ rotateY: -4, rotateX: 3, scale: 1.02, transition: { duration: 0.3, ease: "easeOut" } }} style={{ transformStyle: "preserve-3d" }} className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl group hover:border-white/20 transition-all hover:shadow-[0_24px_50px_rgba(0,255,136,0.1)] will-change-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">Intern Dashboard</h3>
                    <p className="mt-1 text-sm text-white/55">Personalized search and application progress</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-[#00FF88] to-[#00E0FF] p-3 text-black group-hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] transition-all">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Resume Score</span>
                    <Award className="h-4 w-4 text-[#00FF88]" />
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">87</span>
                    <span className="pb-2 text-white/45">/100</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/10">
                    <div className="h-2 w-[87%] rounded-full bg-gradient-to-r from-[#00FF88] to-[#00E0FF]" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { company: "TechCorp", role: "SWE Intern", match: "92%" },
                    { company: "DataLabs", role: "ML Intern", match: "89%" },
                    { company: "CloudSys", role: "Backend Dev", match: "85%" },
                  ].map((job) => (
                    <div key={job.company} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <div className="font-medium text-white">{job.company}</div>
                        <div className="text-sm text-white/50">{job.role}</div>
                      </div>
                      <div className="font-semibold text-[#00FF88]">{job.match}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemReveal} whileHover={{ rotateY: 4, rotateX: 3, scale: 1.02, transition: { duration: 0.3, ease: "easeOut" } }} style={{ transformStyle: "preserve-3d" }} className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl group hover:border-white/20 transition-all hover:shadow-[0_24px_50px_rgba(0,224,255,0.1)] will-change-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">Company Dashboard</h3>
                    <p className="mt-1 text-sm text-white/55">Applicant screening and shortlist management</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-[#00E0FF] to-[#00FF88] p-3 text-black group-hover:shadow-[0_0_20px_rgba(0,224,255,0.5)] transition-all">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: "234" },
                    { label: "Reviewed", value: "156" },
                    { label: "Shortlisted", value: "42" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/45">{stat.label}</div>
                      <div className="mt-2 text-2xl font-bold text-white">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { name: "Sarah Chen", score: 94, status: "approved" },
                    { name: "Alex Kumar", score: 88, status: "pending" },
                    { name: "Jordan Lee", score: 79, status: "rejected" },
                  ].map((candidate) => (
                    <div
                      key={candidate.name}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF88] to-[#00E0FF] text-sm font-bold text-black">
                          {initials(candidate.name)}
                        </div>
                        <div>
                          <div className="font-medium text-white">{candidate.name}</div>
                          <div className="text-sm text-white/50">AI Score: {candidate.score}</div>
                        </div>
                      </div>
                      {candidate.status === "approved" ? (
                        <CheckCircle2 className="h-5 w-5 text-[#00FF88]" />
                      ) : candidate.status === "pending" ? (
                        <Clock className="h-5 w-5 text-[#00E0FF]" />
                      ) : (
                        <XCircle className="h-5 w-5 text-white/30" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden px-4 py-24 sm:px-6" style={{ perspective: "1200px" }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,#010806_100%)]" />
          <div className="relative mx-auto max-w-7xl">
            <motion.div 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              variants={containerReveal}
              className="mx-auto max-w-2xl text-center"
            >
              <motion.p variants={itemReveal} className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/80">Testimonials</motion.p>
              <div className="overflow-hidden mt-4">
                <motion.h2 variants={slideUp} className="text-4xl font-bold sm:text-5xl">
                  Trusted by students and
                  <span className="block bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-transparent">
                    hiring teams
                  </span>
                </motion.h2>
              </div>
            </motion.div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <motion.article
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 40, rotateX: 15, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  whileHover={{ y: -10, scale: 1.04, rotateX: -4, rotateY: index === 0 ? 4 : index === 2 ? -4 : 0, transition: { duration: 0.25, ease: "easeOut" } }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:border-[#00FF88]/40 hover:bg-white/10 hover:shadow-[0_20px_40px_rgba(0,255,136,0.15)] will-change-transform"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00FF88]/0 to-[#00FF88]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative z-10 flex gap-1 text-[#00FF88]">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="relative z-10 mt-5 flex-1 text-base leading-8 text-white/75">"{testimonial.quote}"</p>
                  <div className="relative z-10 mt-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF88] to-[#00E0FF] text-sm font-bold text-black">
                      {initials(testimonial.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-white/50">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id={sectionIds.faq} className="relative overflow-hidden px-4 py-24 sm:px-6" style={{ perspective: "1200px" }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#010806_0%,#001a12_55%,#000000_100%)]" />
          <div className="absolute right-12 top-24 h-72 w-72 rounded-full bg-[#00FF88]/8 blur-[130px]" />
          <div className="relative mx-auto max-w-4xl">
            <motion.div 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              variants={containerReveal}
              className="text-center"
            >
              <motion.p variants={itemReveal} className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00FF88]/80">FAQ</motion.p>
              <div className="overflow-hidden mt-4">
                <motion.h2 variants={slideUp} className="text-4xl font-bold sm:text-5xl">Frequently asked questions</motion.h2>
              </div>
              <motion.p variants={itemReveal} className="mt-5 text-lg text-white/60">Everything users need to know before getting started.</motion.p>
            </motion.div>

            <motion.div 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              variants={containerReveal}
              className="mt-14 space-y-4"
            >
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <motion.div 
                    variants={itemReveal} 
                    key={faq.question} 
                    whileHover={{ scale: 1.01, y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
                    className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-[#00FF88]/40 hover:bg-white/10 hover:shadow-[0_15px_30px_rgba(0,255,136,0.1)] will-change-transform"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#00FF88]/0 to-[#00FF88]/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="relative z-10 flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                    >
                      <span className="text-lg font-semibold text-white">{faq.question}</span>
                      <motion.div 
                        initial={false} 
                        animate={{ rotate: isOpen ? 180 : 0 }} 
                        className={isOpen ? "text-[#00FF88]" : "text-white/60"}
                      >
                        {isOpen ? <Minus className="h-5 w-5 shrink-0" /> : <Plus className="h-5 w-5 shrink-0" />}
                      </motion.div>
                    </button>
                    {isOpen ? (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: "auto", opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }} 
                        className="relative z-10 overflow-hidden px-6 pb-6 pt-0"
                      >
                        <div className="mb-4 h-px bg-gradient-to-r from-[#00FF88]/30 to-[#00E0FF]/20" />
                        <p className="text-white/68 leading-8">{faq.answer}</p>
                      </motion.div>
                    ) : null}
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="mt-12 text-center">
              <a
                href="mailto:support@internai.app"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 font-medium text-white transition-colors hover:border-[#00FF88]/35 hover:text-[#00FF88]"
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden border-t border-white/10 px-4 py-12 sm:px-6">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,#02040a_100%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm">
            <div className="bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-2xl font-bold text-transparent">
              {APP_NAME}
            </div>
            <p className="mt-3 text-sm leading-7 text-white/58">
              AI-powered internship discovery and recruiter workflow management in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-sm text-white/55">
            <a href={`#${sectionIds.features}`} className="transition-colors hover:text-white">
              Features
            </a>
            <a href={`#${sectionIds.workflow}`} className="transition-colors hover:text-white">
              How It Works
            </a>
            <a href={`#${sectionIds.dashboards}`} className="transition-colors hover:text-white">
              Dashboards
            </a>
            <a href="mailto:support@internai.app" className="transition-colors hover:text-white">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="mailto:support@internai.app"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[#00FF88]/30 hover:text-[#00FF88]"
              aria-label="Email support"
            >
              <Mail className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-[#00FF88]/30 hover:text-[#00FF88]"
              aria-label="LinkedIn"
            >
              IN
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-[#00FF88]/30 hover:text-[#00FF88]"
              aria-label="GitHub"
            >
              GH
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
