import { Container } from "@/components/landing/Container";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Wordmark } from "@/components/ui/Wordmark";

// Public landing page: hero + waitlist only (#9). No link to /login here.
export default function Home() {
  return (
    <>
      <header>
        <Container className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <Wordmark size={28} />
          <p className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface-raised px-3 py-1 text-label text-ink">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-highlight motion-safe:animate-pulse"
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
    </>
  );
}
