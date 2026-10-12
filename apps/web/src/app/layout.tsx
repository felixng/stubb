import type { Metadata, Viewport } from "next";
import "./globals.css";

// Type is the system font (SF Pro on Apple devices), set in globals.css, so
// the web matches the iOS app. No web fonts to load.

export const metadata: Metadata = {
  title: "Stubbed — your theatre diary",
  description:
    "Log every show you see, rate it, group it into trips and share it. Coming soon.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans text-body">
        {children}
      </body>
    </html>
  );
}
