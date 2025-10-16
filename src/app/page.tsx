import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Benefits", href: "#benefits" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Plans", href: "#plans" },
  { label: "FAQs", href: "#faqs" },
  { label: "Contact", href: "#contact" },
];

const heroHighlights = [
  "Automatically captures name, phone, and email",
  "Answers FAQs: hours, pricing, stock, location",
  "Instant email alert every time a lead comes in",
];

const valueBullets = [
  "Chat widget on your landing to spark more conversations",
  "Supported channel: Telegram (fast and easy)",
  "Own database: every contact stored and exportable",
];

const howItWorks = [
  {
    title: "Quick setup",
    summary: "We launch your landing with chat and activate the Telegram bot.",
  },
  {
    title: "Load your FAQs",
    summary: "We preload hours, pricing, stock, and location for clear answers.",
  },
  {
    title: "Capture and notify",
    summary: "You start collecting leads and get email alerts instantly.",
  },
  {
    title: "Everything saved",
    summary: "Every contact lives in your database and is exportable on demand.",
  },
];

const plans = [
  {
    name: "Telegram Starter",
    summary: "Lead capture chatbot tuned for FAQs and quick replies.",
    features: [
      "Channels: Telegram bot + landing chat widget",
      "Landing page included with this chatbot plan",
      "FAQ responses (hours, pricing, stock, location)",
      "Captures name, phone, and email",
      "Email notification for every lead",
      "Own database and exportable records",
    ],
    cta: "Start with Starter",
  },
  {
    name: "Telegram Pro + Documents",
    summary: "Everything in Starter plus document-aware answers via RAG.",
    features: [
      "Channels: Telegram bot + landing chat widget",
      "Landing page included with this chatbot plan",
      "Everything in Starter",
      "RAG: the bot answers using your documents (PDF/Docs)",
      "Source citations when needed",
      "Simple document management: upload and update",
    ],
    cta: "See Pro with documents",
  },
];

const faqs = [
  {
    q: "Can I export my leads?",
    a: "Yes, download them anytime.",
  },
  {
    q: "Which channel is supported?",
    a: "Telegram is the only supported messaging channel.",
  },
  {
    q: "What do I need to get started?",
    a: "Your FAQs and, for Pro, the documents you want the bot to use.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-light opacity-90 dark:hidden" />
      <div className="pointer-events-none absolute inset-0 hidden bg-grid-dark opacity-80 dark:block" />
      <div className="pointer-events-none absolute inset-0 floating-particles opacity-50 dark:opacity-35" />
      <div className="relative">
        <Navbar />
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-6 pb-24 pt-16">
          <PromoBanner />
          <Hero />
          <Value />
          <HowItWorks />
          <Plans />
          <FAQs />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="#" className="flex items-center gap-3">
          <Image
            src="/hola.svg"
            alt="TunnelServices logo"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-lg border border-border/60 object-cover shadow-sm"
          />
          <div className="text-sm font-medium text-foreground/85">TunnelServices</div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="transition-colors hover:text-foreground/95">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            size="lg"
            className="hidden rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_rgba(40,123,255,0.3)] md:inline-flex"
          >
            Talk to an expert
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="grid gap-12 md:grid-cols-[minmax(0,520px)_1fr] md:items-center">
      <div className="space-y-7 text-left">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-primary/80">
          Turn visitors into qualified leads
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-[44px]">
          Landing + Telegram bot that captures and answers
        </h1>
        <p className="text-base text-foreground dark:text-foreground">
          Built to start conversations, handle quick questions, and log every contact in your database. Straightforward, ready to sell.
        </p>
        <div className="grid gap-3">
          {heroHighlights.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground dark:text-foreground">
              <Check className="h-4 w-4 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <Button className="rounded-xl bg-primary px-12 py-5 text-sm font-semibold uppercase tracking-[0.28em] text-primary-foreground shadow-[0_18px_40px_rgba(40,123,255,0.35)] dark:shadow-[0_18px_40px_rgba(10,20,45,0.6)]">
            Start with Starter
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-border bg-white px-10 py-5 text-xs font-semibold uppercase tracking-[0.28em] text-foreground shadow-sm dark:border-white/[15%] dark:bg-transparent dark:text-foreground/80"
          >
            See Pro with documents
          </Button>
        </div>
      </div>
      <div className="hidden h-full w-full items-center justify-end md:flex">
        <div className="w-full max-w-xs rounded-3xl border border-border bg-card p-8 shadow-[0_18px_40px_rgba(50,110,190,0.16)] dark:border-border/60 dark:bg-card/80 dark:shadow-[0_18px_40px_rgba(5,12,25,0.6)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80 dark:text-primary/65">
            Essentials
          </p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/85 dark:text-foreground/75">
            <li>• Chat widget on your landing</li>
            <li>• Channel: Telegram</li>
            <li>• Lead capture</li>
            <li>• Email alert</li>
          </ul>
          <p className="mt-4 text-xs text-foreground/70 dark:text-foreground/65">Ready to use in days.</p>
        </div>
      </div>
    </section>
  );
}

function PromoBanner() {
  return (
    <section className="flex items-center justify-between gap-4 rounded-2xl border border-primary/35 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-6 py-4 text-sm text-foreground shadow-[0_20px_45px_rgba(40,123,255,0.18)] dark:border-primary/30 dark:from-primary/20 dark:via-primary/10 dark:to-transparent dark:text-foreground">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(40,123,255,0.35)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary dark:text-primary/90">Chatbot plans</p>
          <p className="text-base font-medium text-foreground dark:text-foreground">
            Launch a Telegram chatbot and get the landing page included, no extra charge.
          </p>
        </div>
      </div>
      <div className="hidden text-xs font-semibold uppercase tracking-[0.32em] text-primary/80 md:block">
        Ready in days
      </div>
    </section>
  );
}

function Value() {
  return (
    <section id="benefits" className="space-y-8">
      <SectionHeading
        eyebrow="Benefits"
        title="What delivers results"
        description="Less friction, more leads. Everything easy to understand."
      />
      <div className="grid gap-3">
        {valueBullets.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-foreground">
            <Check className="h-4 w-4 text-primary" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="space-y-8">
      <SectionHeading
        eyebrow="How it works"
        title="Fast setup, immediate value"
        description="Everything you need to start capturing within days."
      />
      <div className="grid gap-6 md:grid-cols-4">
        {howItWorks.map((step, index) => (
          <div
            key={step.title}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-8 text-sm text-foreground shadow-[0_18px_40px_rgba(60,112,185,0.16)] dark:bg-card/90 dark:text-foreground dark:shadow-[0_16px_45px_rgba(5,12,25,0.6)]"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">0{index + 1}</span>
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="text-foreground/85 dark:text-foreground/80">{step.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section id="plans" className="space-y-8">
      <SectionHeading
        eyebrow="Plans"
        title="Choose how to start"
        description="Two clear options. No fine print."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="rounded-2xl border border-border bg-card p-8 shadow-[0_18px_45px_rgba(70,130,210,0.16)] dark:bg-card/90 dark:shadow-[0_16px_45px_rgba(5,12,25,0.6)]"
          >
            <p className="text-base font-semibold text-foreground">{plan.name}</p>
            {plan.summary && (
              <p className="mt-2 text-sm text-foreground/80 dark:text-foreground/75">{plan.summary}</p>
            )}
            <ul className="mt-4 space-y-2 text-sm text-foreground/85 dark:text-foreground">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button className="rounded-lg bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground">
                {plan.cta}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQs() {
  return (
    <section id="faqs" className="space-y-8">
      <SectionHeading
        eyebrow="FAQs"
        title="Quick answers"
        description="Only what matters, no jargon."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {faqs.map((item) => (
          <div
            key={item.q}
            className="rounded-2xl border border-border bg-card p-6 text-sm text-foreground shadow-[0_12px_30px_rgba(70,130,210,0.12)] dark:bg-card/90 dark:shadow-[0_12px_30px_rgba(5,12,25,0.5)]"
          >
            <p className="font-semibold text-foreground">{item.q}</p>
            <p className="mt-2 text-foreground/85">{item.a}</p>
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
      className="space-y-6 rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-foreground shadow-[0_18px_45px_rgba(60,120,200,0.16)] dark:bg-card/85 dark:text-foreground dark:shadow-[0_18px_45px_rgba(5,12,25,0.6)]"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Start today: we set everything up and you capture leads in days.
      </h2>
      <div className="flex flex-wrap justify-center gap-3">
        <Button className="rounded-xl bg-primary px-10 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-primary-foreground shadow-[0_16px_40px_rgba(40,123,255,0.3)]">
          Start with Starter
        </Button>
        <Button
          variant="outline"
          className="rounded-xl border-border bg-transparent px-8 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-foreground dark:text-foreground/80"
        >
          See Pro with documents
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background/85">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 text-sm text-foreground/70 md:flex-row md:items-start md:justify-between">
        <p>TunnelServices · Practical AI and automation.</p>
        <div className="space-y-2">
          <p>tunnels.agency@gmail.com</p>
        </div>
        <div className="space-y-2">
          <p>LinkedIn</p>
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
    <div className="space-y-2 text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">{title}</h2>
      <p className="text-sm text-foreground/75">{description}</p>
    </div>
  );
}
