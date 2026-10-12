import { Container } from "@/components/landing/Container";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Wordmark } from "@/components/ui/Wordmark";

// Public landing page: hero + waitlist only (#9). No link to /login here.
export default function Home() {
  return (
    <>
      <header>
        <Container className="py-6 sm:py-8">
          <Wordmark size={28} />
        </Container>
      </header>
      <main className="flex-auto">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
