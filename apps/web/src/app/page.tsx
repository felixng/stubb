import type { Viewport } from "next";

import { Container } from "@/components/landing/Container";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { SiteMenu } from "@/components/landing/SiteMenu";
import { Wordmark } from "@/components/ui/Wordmark";

// The landing page is always light, whatever the visitor's appearance.
export const viewport: Viewport = { themeColor: "#fff9f6" };

// Public landing page: hero + waitlist and features (#9). The menu links to
// /login (owner's call); sign-ups stay off, so that reveals nothing.
export default function Home() {
  return (
    <div data-theme="light" className="flex flex-1 flex-col">
      <header>
        <Container className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <Wordmark size={28} href="/" />
          <div className="flex items-center gap-2">
            <p className="inline-flex min-h-7 items-center gap-2 rounded-pill bg-fill px-3 text-footnote font-medium text-label">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-star motion-safe:animate-pulse"
              />
              <span className="sm:hidden">Private beta</span>
              <span className="hidden sm:inline">Currently in private beta</span>
            </p>
            <SiteMenu />
          </div>
        </Container>
      </header>
      <main className="flex-auto">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
