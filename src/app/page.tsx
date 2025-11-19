import Image from "next/image";
import Link from "next/link";
import { Check, FileText, MessageSquare, ShieldCheck, Sparkles, Timer } from "lucide-react";

import { ContactDialog } from "@/components/contact-dialog";
import UnloquiaChatWidget from "@/components/UnloquiaChatWidget";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Value", href: "#value" },
  { label: "Approach", href: "#approach" },
  { label: "Plans", href: "#plans" },
];

const valuePoints = [
  "Enterprise-grade automation that delivers measurable ROI from day one.",
  "Reduce support costs by 70% with intelligent FAQ handling.",
  "Scale your customer service without scaling your team.",
];

const approachPoints = [
  {
    title: "Client-Centric Focus",
    description:
      "We begin with a deep understanding of your unique needs and vision, ensuring alignment at every step.",
  },
  {
    title: "Innovative Solutions",
    description: "We stay ahead of the curve, using the latest tech to keep your business competitive.",
  },
  {
    title: "Agile Methodology",
    description: "We break projects into manageable phases so we can adapt quickly and optimize results.",
  },
  {
    title: "Comprehensive Support",
    description:
      "We build long-term partnerships, providing ongoing support and maintenance for sustained success.",
  },
];

const planColumns = ["Essential Chatbot", "Multichannel Chatbot", "Smart Chatbot"];

const planMatrix = [
  { feature: "Channel focus", values: ["Landing page bot", "Landing + preferred channel", "Landing + preferred channel"] },
  { feature: "Embedded chatbot", values: ["✓", "✓", "✓"] },
  { feature: "Messaging channel bot", values: ["-", "✓", "✓"] },
  { feature: "Document-aware answers", values: ["-", "-", "✓"] },
  { feature: "Lead database & export", values: ["✓", "✓", "✓"] },
  { feature: "Notifications", values: ["Email", "Email + preferred channel", "Email + preferred channels"] },
  { feature: "Support", values: ["Guided onboarding", "Priority updates", "Dedicated success + analytics"] },
];

const processSteps = [
  "Book a free consultation.",
  "We build your landing page and configure your chatbot.",
  "Go live and start capturing leads automatically.",
  "Receive instant notifications and grow your customer base effortlessly.",
];

const faqs = [
  {
    question: "How can a chatbot help my business grow?",
    answer:
      "Our bots capture leads, answer FAQs, and save your team hours every week so you can focus on closing deals.",
  },
  {
    question: "What messaging services are supported?",
    answer: "We can integrate with popular platforms like Telegram, WhatsApp, and more.",
  },
  {
    question: "Can chatbots answer using my documents?",
    answer:
      "With our Smart Insights plan, your bot can provide answers directly from your uploaded PDFs and docs, complete with source citations.",
  },
];

export default function Home() {
  const clientId = process.env.NEXT_PUBLIC_UNLOQUIA_CLIENT_ID;

  if (process.env.NODE_ENV !== "production" && !clientId) {
    console.warn(
      "Unloquia chat widget disabled: missing NEXT_PUBLIC_UNLOQUIA_CLIENT_ID env variable."
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50 dark:from-slate-950 dark:to-slate-900 text-foreground">
      <ForestBackdrop />
      <div className="relative">
        <Navbar />
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:gap-12 px-4 sm:px-6 pb-8 sm:pb-12 pt-4 sm:pt-6 md:gap-16 md:pb-16 md:pt-8">
          <Hero />
          <ValueSection />
          <AboutSection />
          <ApproachSection />
          <PlansSection />
          <ProcessSection />
          <FAQSection />
          <FinalCTA />
        </main>
        <Footer />
      </div>
      {clientId ? <UnloquiaChatWidget clientId={clientId} /> : null}
    </div>
  );
}

function ForestBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      <div className="pointer-events-none absolute inset-0 bg-grid-modern opacity-30" />
    </>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-300 dark:border-slate-800 shadow-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-2 sm:py-3">
        <Link href="#" className="flex items-center gap-2 sm:gap-3 group">
          <div className="relative">
            <Image
              src="/logo.png"
              alt="Tunnels Services logo"
              width={56}
              height={56}
              priority
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl bg-white p-1 object-contain transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent opacity-0 blur-xl transition-opacity group-hover:opacity-50" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Tunnels Services
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                prefetch={false}
                scroll
                className="relative transition-colors hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ContactDialog
              trigger={
                <Button className="hidden md:inline-flex relative overflow-hidden rounded-full bg-gradient-to-r from-primary to-accent px-6 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-105 hover:shadow-lg">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] opacity-0 transition-opacity hover:opacity-100 hover:animate-gradient-animation" />
                </Button>
              }
            />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 text-white md:p-12 border border-slate-700/50 shadow-2xl dark:shadow-card-hover">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

      <div className="relative grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,550px)_1fr] lg:items-center">
        <div className="space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-200">Limited Spots Available</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            <span className="block text-white">Stop Losing Customers</span>
            <span className="block mt-1 sm:mt-2 text-slate-300">While You Sleep</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
            We're a new agency on a mission: help 50 businesses automate their customer service by year-end. <span className="text-white font-semibold">Join innovative businesses already transforming their customer experience.</span>
          </p>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="p-4 sm:p-5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10">
              <p className="font-semibold text-white mb-1.5 sm:mb-2 text-sm sm:text-base">
                🚀 Early Adopter Benefits
              </p>
              <p className="text-xs sm:text-sm text-slate-300">
                Lock in founder pricing forever. No setup fees for our first 50 clients.
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10">
              <p className="font-semibold text-white mb-1.5 sm:mb-2 text-sm sm:text-base">
                ⏱️ Professional Setup
              </p>
              <p className="text-xs sm:text-sm text-slate-300">
                Implementation tailored to your business complexity. Full support included.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <ContactDialog
              trigger={
                <Button className="w-full sm:w-auto rounded-lg bg-white text-slate-900 px-6 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold shadow-lg transition-all hover:bg-slate-100 hover:shadow-xl">
                  Claim Your Spot
                </Button>
              }
            />
            <ContactDialog
              trigger={
                <Button
                  variant="outline"
                  className="w-full sm:w-auto rounded-lg border-2 border-white/30 bg-transparent px-6 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  See Demo
                </Button>
              }
            />
          </div>
        </div>

        <div className="hidden md:flex md:justify-end">
          <div className="relative">
            {/* Stats Card */}
            <div className="relative bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">Limited Time Offer</h3>
                  <span className="text-xs bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded-full">Active</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <div>
                      <p className="text-white text-sm font-medium">No Setup Fee</p>
                      <p className="text-slate-400 text-xs">Save $399-899</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <div>
                      <p className="text-white text-sm font-medium">Fast Implementation</p>
                      <p className="text-slate-400 text-xs">Tailored to your needs</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <div>
                      <p className="text-white text-sm font-medium">Direct Support</p>
                      <p className="text-slate-400 text-xs">Access to founders</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <p className="text-sm text-white font-medium mb-2">Why clients choose us:</p>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-300">• "Best decision for our business" - Local Store</p>
                    <p className="text-xs text-slate-300">• "Leads increased 3x in first month" - Agency</p>
                    <p className="text-xs text-slate-300">• "Finally, automation that works" - Startup</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ValueSection() {
  return (
    <section id="value" className="space-y-8">
      <SectionHeading
        eyebrow="Why Choose Us"
        title="Turn Every Visitor Into a Potential Customer"
        description="Stop losing leads. Our AI-powered automation captures, qualifies, and nurtures prospects 24/7 while you sleep."
      />
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {valuePoints.map((point, index) => (
          <div
            key={point}
            className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 border border-slate-300 dark:border-slate-600 p-5 sm:p-6 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl dark:hover:shadow-card-hover"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl transition-all group-hover:scale-150" />
            <div className="relative">
              <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white">
                <span className="text-lg sm:text-xl font-bold">{index + 1}</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">{point}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-accent/10 p-10">
      <div className="absolute inset-0 bg-grid-modern opacity-5" />
      <div className="relative">
        <SectionHeading
          eyebrow="Who We Are"
          title="Small Team, Big Impact"
          description="We're a boutique automation agency founded in 2024. Our mission is simple: make AI chatbots accessible to every business, not just enterprises with huge budgets."
        />
        <div className="grid gap-6 sm:grid-cols-3 mt-8">
          <InsightBadge
            icon={MessageSquare}
            label="Always Available"
            detail="Your chatbot works 24/7, weekends and holidays. Never miss another opportunity."
          />
          <InsightBadge
            icon={Timer}
            label="Quick Setup"
            detail="Most clients go live within a week. We handle all the technical complexity."
          />
          <InsightBadge
            icon={FileText}
            label="Real Support"
            detail="Direct access to founders. We answer questions, not ticket numbers."
          />
        </div>
      </div>
    </section>
  );
}

function ApproachSection() {
  return (
    <section id="approach" className="space-y-8">
      <SectionHeading
        eyebrow="Our Approach"
        title="A delivery model built for clarity and momentum"
        description="Every engagement is managed with transparency, iteration, and measurable checkpoints."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {approachPoints.map((point) => (
          <div
            key={point.title}
            className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(32,72,132,0.14)] backdrop-blur-md dark:border-border/45 dark:bg-card/80"
          >
            <p className="text-sm font-semibold text-foreground">{point.title}</p>
            <p className="mt-2 text-sm text-foreground/75">{point.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlansSection() {
  return (
    <section id="plans" className="space-y-8">
      <SectionHeading
        eyebrow="Transparent Pricing"
        title="Investment Plans for Every Business Stage"
        description="Professional automation solutions with clear pricing and no hidden fees."
      />

      {/* Pricing Cards */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
        {/* Essential Plan */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/70 border border-slate-300 dark:border-slate-600 shadow-lg transition-all hover:shadow-xl dark:shadow-card-hover">
          <div className="p-6 sm:p-8 h-full flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Essential Chatbot</h3>
            <div className="mb-4">
              <p className="text-3xl sm:text-4xl font-bold text-foreground">
                $197
                <span className="text-sm sm:text-base font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2 line-through">Setup fee: $399</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">✓ Setup Fee Waived - Limited Time</p>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Foundation for growing businesses</p>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Custom contact page included</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Website-integrated chatbot for FAQs and lead capture</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Lead database with export tools</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Instant team notifications</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Automated reply system</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Personalized training session</span>
              </li>
            </ul>

            <ContactDialog
              trigger={
                <Button className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold">
                  Start Now
                </Button>
              }
            />
          </div>
        </div>

        {/* Popular Plan */}
        <div className="group relative overflow-hidden rounded-2xl border-2 border-primary bg-gradient-to-b from-blue-50 to-white dark:from-slate-800 dark:to-slate-800/70 shadow-xl transition-all hover:shadow-2xl dark:shadow-primary-glow">
          <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2 text-xs font-bold uppercase tracking-wide">
            Recommended for Growth
          </div>
          <div className="p-6 sm:p-8 pt-10 sm:pt-12 h-full flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Multichannel Chatbot</h3>
            <div className="mb-4">
              <p className="text-3xl sm:text-4xl font-bold text-primary">
                $297
                <span className="text-sm sm:text-base font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2 line-through">Setup fee: $599</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">✓ Setup Fee Waived - Limited Time</p>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Scale across all channels</p>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">All Essential features included</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Extended presence on Telegram & WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Multi-network integration</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Custom channel configurations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced analytics dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Interactive buttons & workflows</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Personalized training session</span>
              </li>
            </ul>

            <ContactDialog
              trigger={
                <Button className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold shadow-lg">
                  Get Started Today
                </Button>
              }
            />
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/70 border border-slate-300 dark:border-slate-600 shadow-lg transition-all hover:shadow-xl dark:shadow-card-hover">
          <div className="p-6 sm:p-8 h-full flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Smart Chatbot</h3>
            <div className="mb-4">
              <p className="text-3xl sm:text-4xl font-bold text-foreground">
                $497
                <span className="text-sm sm:text-base font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2 line-through">Setup fee: $899</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">✓ Setup Fee Waived - Limited Time</p>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Enterprise AI intelligence</p>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">All Multichannel features</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">AI-enhanced RAG responses from your documents</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced automation workflows</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Fine-tuned AI models</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Premium CRM integration</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Priority support with SLA</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Automated document generation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">Premium onboarding & analytics</span>
              </li>
            </ul>

            <ContactDialog
              trigger={
                <Button className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold">
                  Contact Sales
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-medium">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span>No Hidden Fees</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-medium">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span>Cancel Anytime</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-medium">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span>24/7 Support</span>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="process" className="space-y-8">
      <SectionHeading
        eyebrow="How It Works"
        title="Launch with confidence, scale with ease"
        description="We guide you from kickoff to go-live with transparent milestones and ongoing support."
      />
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {processSteps.map((step, index) => (
          <div
            key={step}
            className="flex flex-col gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/60 border border-slate-300 dark:border-slate-600 p-4 sm:p-6 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all dark:shadow-card-hover"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">0{index + 1}</span>
            <p className="text-foreground/80">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faqs" className="space-y-8">
      <SectionHeading
        eyebrow="FAQs"
        title="Quick answers to the most common questions"
        description="Have more questions? We’ll address them during your demo."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border border-border bg-card/95 p-6 text-sm text-foreground shadow-sm dark:bg-card/80"
          >
            <p className="font-semibold text-foreground">{faq.question}</p>
            <p className="mt-2 text-foreground/75">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section
      id="contact"
      className="space-y-6 rounded-3xl border border-border/70 bg-card/95 px-6 py-12 text-center text-sm text-foreground shadow-[0_26px_60px_rgba(32,72,132,0.18)] backdrop-blur-md dark:border-border/45 dark:bg-card/75"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Ready to automate and grow?
      </h2>
      <p className="mx-auto max-w-2xl text-foreground/75">
        Contact us for a personalized demo and see how we can capture more value for your business, starting today.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <ContactDialog
          trigger={
            <Button className="rounded-xl bg-primary px-10 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-primary-foreground shadow-[0_18px_48px_rgba(44,104,180,0.35)] transition-colors hover:bg-primary/90 dark:bg-primary/90 dark:text-primary-foreground">
              Start Today
            </Button>
          }
        />
        <ContactDialog
          trigger={
            <Button
              variant="outline"
              className="rounded-xl border border-border/70 bg-transparent px-8 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-secondary/40 dark:border-border/45 dark:text-foreground/80 dark:hover:bg-secondary/30"
            >
              Book a Demo
            </Button>
          }
        />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6 px-4 sm:px-6 py-6 sm:py-10 text-xs sm:text-sm text-foreground/65 md:flex-row md:items-start md:justify-between">
        <p className="max-w-sm text-foreground/70">
          Tunnels Services · Automated lead capture and intelligent support.
        </p>
        <div className="space-y-2 text-foreground/70">
          <p>tunnels.agency@gmail.com</p>
        </div>
        <div className="space-y-2 text-foreground/70">
          <a
            href="https://www.linkedin.com/company/tunnels-agency"
            rel="noopener noreferrer"
            target="_blank"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2 sm:space-y-3 text-left">
      <div className="flex items-center gap-3">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.32em] text-primary/75">{eyebrow}</p>
        <span className="hidden h-px flex-1 bg-gradient-to-r from-primary/45 via-primary/15 to-transparent sm:block" />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground md:text-[30px]">{title}</h2>
      <p className="max-w-2xl text-xs sm:text-sm text-foreground/70">{description}</p>
    </div>
  );
}

function InsightBadge({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof MessageSquare;
  label: string;
  detail: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-slate-800/70 border border-slate-300 dark:border-slate-600 p-6 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:hover:shadow-card-hover">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl transition-all group-hover:scale-150" />
      <div className="relative">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white mb-4">
          <Icon className="h-6 w-6" />
        </span>
        <p className="font-bold text-foreground mb-2">{label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}
