import { Container } from "@/components/landing/Container";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col items-center justify-between gap-2 py-8 text-caption text-ink-muted sm:flex-row">
        <p>Built by a theatre regular, for the theatre regulars.</p>
        <p>&copy; Stubbed</p>
      </Container>
    </footer>
  );
}
