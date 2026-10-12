import type { Viewport } from "next";

import { Container } from "@/components/landing/Container";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Wordmark } from "@/components/ui/Wordmark";

// The landing page is always light, whatever the visitor's appearance.
export const viewport: Viewport = { themeColor: "#f2f2f7" };

// Public landing page: hero + waitlist only (#9). No link to /login here.
export default function Home() {
  return (
    <div data-theme="light" className="flex flex-1 flex-col">
      <header>
        <Container className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <Wordmark size={22} />
          <p className="inline-flex min-h-7 items-center gap-2 rounded-pill bg-fill px-3 text-footnote font-medium text-label">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-star motion-safe:animate-pulse"
            />
            <span className="sm:hidden">Private beta</span>
            <span className="hidden sm:inline">Currently in private beta</span>
          </p>
        </Container>
      </header>
      <main className="flex-auto">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
