import { NextResponse } from "next/server";
import { Resend } from "resend";

const RECIPIENT = "tunnels.services@gmail.com";
const DEFAULT_FROM = "Tunnels Services <onboarding@resend.dev>";

export async function POST(request: Request) {
  try {
    const { name, email, company, message } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Resend API key." }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_ADDRESS ?? DEFAULT_FROM;

    const lines = [
      `Name: ${name || "Not provided"}`,
      `Email: ${email}`,
      `Company: ${company || "Not provided"}`,
      "",
      message || "No message provided.",
    ];

    await resend.emails.send({
      from: fromAddress,
      to: RECIPIENT,
      replyTo: email,
      subject: `Demo request from ${name || "website visitor"}`,
      text: lines.join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact] Failed to send email", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
