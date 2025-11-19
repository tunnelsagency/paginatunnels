import { NextResponse } from "next/server";
import { Resend } from "resend";

const RECIPIENT = "tunnels.agency@gmail.com";
const DEFAULT_FROM = "Tunnels Services <onboarding@resend.dev>";

// Email validation regex
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

export async function POST(request: Request) {
  try {
    const { name, email, company, message } = await request.json();

    console.log("[contact] Received request with:", { name, email, company, message });

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format. Please provide a valid email address." }, { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[contact] Missing RESEND_API_KEY environment variable");
      return NextResponse.json({ error: "Missing Resend API key." }, { status: 500 });
    }

    console.log("[contact] Using API key starting with:", apiKey.substring(0, 10) + "...");

    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_ADDRESS ?? DEFAULT_FROM;

    console.log("[contact] Sending email from:", fromAddress, "to:", RECIPIENT);

    const lines = [
      `Name: ${name || "Not provided"}`,
      `Email: ${email}`,
      `Company: ${company || "Not provided"}`,
      "",
      message || "No message provided.",
    ];

    const emailData = {
      from: fromAddress,
      to: RECIPIENT,
      replyTo: email,
      subject: `Demo request from ${name || "website visitor"}`,
      text: lines.join("\n"),
    };

    console.log("[contact] Attempting to send email with data:", emailData);

    const result = await resend.emails.send(emailData);

    console.log("[contact] Email sent successfully, result:", result);

    return NextResponse.json({ ok: true, emailId: result.data?.id });
  } catch (error) {
    console.error("[contact] Failed to send email, full error:", error);
    // Return more detailed error information for debugging
    return NextResponse.json({
      error: "Failed to send message.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
