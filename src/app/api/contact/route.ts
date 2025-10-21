import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const RECIPIENT = "tunnels.services@gmail.com";
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS ?? "Tunnels Services <noreply@tunnelsservices.ai>";

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing Resend API key." }, { status: 500 });
  }

  try {
    const { name, email, company, message } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const lines = [
      `Name: ${name || "Not provided"}`,
      `Email: ${email}`,
      `Company: ${company || "Not provided"}`,
      "",
      message || "No message provided.",
    ];

    await resend.emails.send({
      from: FROM_ADDRESS,
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
