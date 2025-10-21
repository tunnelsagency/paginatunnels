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

const title = "Tunnels Services — IA y Automatización que convierten";
const description =
  "Bots conversacionales, flujos automatizados e inteligencia aplicada. De idea a ROI sin fricción.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://tunnelsservices.ai"),
  openGraph: {
    title,
    description,
    url: "https://tunnelsservices.ai",
    siteName: "Tunnels Services",
    images: [
      {
        url: "/og/tunnelservices-og-dark.svg",
        width: 1200,
        height: 630,
        alt: "Tunnels Services — IA y Automatización que convierten",
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
    icon: [
      { url: "/favicon.png", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/favicon.png" }],
    shortcut: ["/favicon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${manrope.variable} ${mono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
