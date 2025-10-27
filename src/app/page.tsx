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
  "Convert web visitors into customers with instant, helpful responses.",
  "Answer FAQs day and night - no extra team required.",
  "Streamline operations and focus on closing more deals.",
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

const planColumns = ["Essential Chat", "Multichannel Engage", "Smart Insights"];

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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ForestBackdrop />
      <div className="relative">
        <Navbar />
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 pb-12 pt-20 md:gap-20 md:pb-16 md:pt-24">
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
      <div className="pointer-events-none absolute inset-0 bg-forest-sky dark:hidden" />
      <div className="pointer-events-none absolute inset-0 hidden bg-forest-sky-dark dark:block" />
      <div className="pointer-events-none absolute inset-0 pine-texture opacity-30 dark:opacity-20" />
      <div className="pointer-events-none absolute inset-0 floating-particles opacity-30 dark:opacity-25" />
    </>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="#" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Tunnels Services logo"
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-lg bg-white p-1 object-contain"
          />
          <div className="text-sm font-semibold tracking-wide text-foreground/85">Tunnels Services</div>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                prefetch={false}
                scroll
                className="transition-colors hover:text-foreground/95"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ContactDialog
              trigger={
                <Button className="hidden rounded-full border border-primary/20 bg-primary px-5 text-xs font-semibold uppercase tracking-[0.26em] text-primary-foreground shadow-[0_14px_30px_rgba(62,120,200,0.25)] transition-colors hover:bg-primary/90 dark:border-primary/40 dark:bg-primary/90 dark:text-primary-foreground md:inline-flex">
                  Get in contact
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
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/70 p-8 text-white shadow-[0_32px_68px_rgba(18,34,60,0.3)] md:p-12">
      <div className="pointer-events-none absolute inset-0 forest-wallpaper opacity-75" />
      <div className="pointer-events-none absolute inset-0 hero-overlay dark:hidden" />
      <div className="pointer-events-none absolute inset-0 hidden hero-overlay-dark dark:block" />
      <div className="relative grid gap-12 md:grid-cols-[minmax(0,500px)_1fr] md:items-center">
        <div className="space-y-8 text-white">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-white/85">
            <Sparkles className="h-4 w-4 text-white" />
            Automated growth agency
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-[46px]">
            Grow Smarter With Automated Lead Capture &amp; Instant Answers
          </h1>
          <p className="text-base text-white/80">
            Empower your business with a custom landing page and intelligent chatbots - capturing leads, answering
            questions, and saving you time, 24/7.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm text-white/80 backdrop-blur-md">
              <p className="font-semibold text-white/90">What changes</p>
              <p className="mt-2">
                From the moment visitors land, they receive precise answers and a clear route to convert.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm text-white/80 backdrop-blur-md">
              <p className="font-semibold text-white/90">Why it works</p>
              <p className="mt-2">
                We layer trust-driven design with automation, ensuring every interaction feels immediate and reliable.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <ContactDialog
              trigger={
                <Button className="rounded-xl bg-primary px-10 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-primary-foreground shadow-[0_18px_48px_rgba(20,60,140,0.4)] transition-colors hover:bg-primary/90 dark:bg-primary/90 dark:text-primary-foreground">
                  Start Today
                </Button>
              }
            />
            <ContactDialog
              trigger={
                <Button
                  variant="outline"
                  className="rounded-xl border border-white/40 bg-white/10 px-10 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/30"
                >
                  Book a Demo
                </Button>
              }
            />
          </div>
        </div>
        <div className="hidden md:flex md:justify-end">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-8 text-sm text-white/80 shadow-[0_26px_60px_rgba(10,24,48,0.45)] backdrop-blur-xl">
            <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/12 blur-3xl" />
            <div className="relative space-y-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-10 w-10 rounded-full bg-white/12 p-2 text-white" />
                <div>
                  <p className="text-sm font-semibold text-white/90">Confidence signals</p>
                  <p className="text-xs text-white/65">Designed into every flow</p>
                </div>
              </div>
              <p>
                Clear privacy messaging, human escalation paths, and audit-ready logs keep visitors and teams aligned.
              </p>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-xs text-white/75 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/80">Time-to-response</span>
                  <span className="font-semibold text-white">Instant</span>
                </div>
                <p className="mt-2 text-white/65">
                  Escalations route to your team with full context and lead data.
                </p>
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
        eyebrow="Our Value Proposition"
        title="How can you capture more leads automatically?"
        description="We combine intelligent automation with high-converting landing page design, giving visitors answers the moment they ask."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {valuePoints.map((point) => (
          <div
            key={point}
            className="rounded-2xl border border-border bg-card/95 p-6 text-sm text-foreground shadow-sm backdrop-blur-sm dark:bg-card/85"
          >
            <p>{point}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="grid gap-8 rounded-3xl border border-border/70 bg-card/90 p-10 shadow-[0_26px_60px_rgba(32,72,132,0.18)] backdrop-blur-lg dark:border-border/45 dark:bg-card/70">
      <SectionHeading
        eyebrow="About us"
        title="Technology-driven, growth-focused"
        description="We’re a technology-driven agency focused on helping businesses grow through automation. Our solutions combine beautiful landing pages with smart chatbot technology, ensuring you never miss a lead and always deliver top-notch support."
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <InsightBadge icon={MessageSquare} label="24/7 coverage" detail="Chatbots resolve FAQs so your team can rest." />
        <InsightBadge icon={Timer} label="Faster handoffs" detail="Instant notifications with context-rich lead data." />
        <InsightBadge
          icon={FileText}
          label="Ready to scale"
          detail="Landing + chatbot stack evolves with your channels and docs."
        />
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
        eyebrow="Plans & Pricing"
        title="Compare the right level of automation for your team"
        description="From foundational lead capture to document-aware intelligence."
      />
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-[0_26px_60px_rgba(32,72,132,0.16)] backdrop-blur-md">
        <div className="grid grid-cols-[180px_repeat(3,minmax(0,1fr))] border-b border-border/70 bg-secondary/40 px-6 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-foreground/70">
          <div className="text-left">Plan</div>
          {planColumns.map((plan) => (
            <div key={plan} className="text-center text-foreground font-semibold">
              {plan}
            </div>
          ))}
        </div>
        <div className="divide-y divide-border/60 text-sm">
          {planMatrix.map((row) => (
            <div key={row.feature} className="grid grid-cols-[180px_repeat(3,minmax(0,1fr))] px-6 py-4">
              <div className="font-medium text-foreground/80">{row.feature}</div>
              {row.values.map((value, index) => (
                <div key={`${row.feature}-${planColumns[index]}`} className="text-center text-foreground/80">
                  {value === "✓" ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : value === "-" ? (
                    <span className="text-lg font-semibold text-foreground/30">-</span>
                  ) : (
                    <span>{value}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-foreground/60">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-2 uppercase tracking-[0.22em]">
          Transparent setup + monthly maintenance
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-2 uppercase tracking-[0.22em]">
          Upgrade any time
        </span>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="process" className="space-y-8">
      <SectionHeading
        eyebrow="How It Works"
        title="Launch in weeks, scale in days"
        description="We guide you from kickoff to go-live with transparent milestones and ongoing support."
      />
      <div className="grid gap-4 md:grid-cols-4">
        {processSteps.map((step, index) => (
          <div
            key={step}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-6 text-sm text-foreground shadow-[0_18px_42px_rgba(32,72,132,0.14)] dark:bg-card/80"
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
    <footer className="border-t border-border bg-background/95">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 text-sm text-foreground/65 md:flex-row md:items-start md:justify-between">
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
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/75">{eyebrow}</p>
        <span className="hidden h-px flex-1 bg-gradient-to-r from-primary/45 via-primary/15 to-transparent sm:block" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[30px]">{title}</h2>
      <p className="max-w-2xl text-sm text-foreground/70">{description}</p>
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/95 p-5 text-sm text-foreground shadow-sm dark:border-border/40 dark:bg-card/75">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-foreground/70">{detail}</p>
    </div>
  );
}
