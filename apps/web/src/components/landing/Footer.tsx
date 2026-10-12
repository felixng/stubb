import { Container } from "@/components/landing/Container";

export function Footer() {
  return (
    <footer className="border-t border-dashed border-line">
      <Container className="flex flex-col items-center justify-between gap-2 py-8 text-sm text-ink-muted sm:flex-row">
        <p>Built by a theatregoer.</p>
        <p>&copy; Stubbed</p>
      </Container>
    </footer>
  );
}
