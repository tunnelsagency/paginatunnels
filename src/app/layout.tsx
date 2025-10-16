import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const title = "TunnelServices — IA y Automatización que convierten";
const description =
  "Bots conversacionales, flujos automatizados e inteligencia aplicada. De idea a ROI sin fricción.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://tunnelservices.ai"),
  openGraph: {
    title,
    description,
    url: "https://tunnelservices.ai",
    siteName: "TunnelServices",
    images: [
      {
        url: "/og/tunnelservices-og-dark.svg",
        width: 1200,
        height: 630,
        alt: "TunnelServices — IA y Automatización que convierten",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og/tunnelservices-og-dark.svg"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${manrope.variable} ${mono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
