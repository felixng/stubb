import { Container } from "@/components/landing/Container";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";

// Public landing page: hero + waitlist only (#9). No link to /login here.
export default function Home() {
  return (
    <>
      <header>
        <Container className="py-6 sm:py-8">
          <p className="font-display text-2xl font-semibold tracking-tight text-ink">
            Stubbed
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
