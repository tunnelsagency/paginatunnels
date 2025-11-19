"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, Mail, TriangleAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ContactDialogProps {
  trigger: ReactNode;
}

export function ContactDialog({ trigger }: ContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setErrorMessage(null);
    }
  }, [open]);

  const validateEmail = (email: string): boolean => {
    // RFC 5322 compliant email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = formRef.current; // Use the ref, event.currentTarget can be nulled after awaits.
    if (!form) {
      console.error("contact form element not found");
      return;
    }

    const formData = new FormData(form);
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const company = (formData.get("company") as string | null)?.trim() ?? "";
    const message = (formData.get("message") as string | null)?.trim() ?? "";

    // Validate email before sending
    if (!email) {
      setErrorMessage("Please enter your email address.");
      setStatus("error");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address (e.g., name@example.com).");
      setStatus("error");
      return;
    }

    // Validate name
    if (!name) {
      setErrorMessage("Please enter your name.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, company, message }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string; details?: string };
        console.error("Email API error response:", errorData);
        throw new Error(errorData.details || errorData.error || "Unknown error");
      }

      if (form) {
        form.reset();
      }
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setOpen(false);
      }, 1400);
    } catch (error) {
      console.error("Failed to send contact form:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(`We couldn't send your message: ${errorMsg}. Please try again in a moment.`);
      setStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-full max-w-lg border border-border/70 bg-card/95 px-6 py-8 shadow-[0_24px_60px_rgba(20,42,80,0.22)] backdrop-blur-md dark:border-border/50 dark:bg-card/80">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Book a personalized demo
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground/70">
            Share a few details and we&apos;ll reach out from tunnels.agency@gmail.com to schedule your session.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} className="mt-4 space-y-5 text-left" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" placeholder="Your name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" placeholder="Optional" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">How can we help?</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Tell us about your goals, timelines, or the plan that caught your eye."
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-4 text-xs text-foreground/70 dark:border-border/50 dark:bg-secondary/20 dark:text-foreground/65">
            <p className="font-semibold text-foreground/80">What happens next?</p>
            <ul className="space-y-1 text-foreground/70 dark:text-foreground/65">
              <li>• We reply within one business day.</li>
              <li>• You receive a calendar link and tailored walkthrough.</li>
              <li>• All conversations stay private to our team.</li>
            </ul>
          </div>
          {status === "success" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <Check className="h-4 w-4" />
              Message sent. We&apos;ll get back to you shortly.
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <TriangleAlert className="h-4 w-4" />
              {errorMessage}
            </div>
          )}
          <Button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary-foreground shadow-[0_16px_42px_rgba(20,60,140,0.35)] transition-colors hover:bg-primary/90 dark:bg-primary/90 dark:text-primary-foreground dark:hover:bg-primary/80"
            disabled={status === "sending"}
          >
            {status === "sending" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : status === "success" ? (
              <>
                <Check className="h-4 w-4" />
                Sent!
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Contact Tunnels Services
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
