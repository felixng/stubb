import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

// Display: theatrical serif for titles. Sans: UI. Mono: ticket-stub details.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Stubbed — your theatre diary",
  description:
    "Log every show you see, rate it, group it into trips and share it. Coming soon.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f1e6" },
    { media: "(prefers-color-scheme: dark)", color: "#141012" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
