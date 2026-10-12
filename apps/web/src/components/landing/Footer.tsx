import { Container } from "@/components/landing/Container";

export function Footer() {
  return (
    <footer className="border-t border-separator">
      <Container className="flex flex-col items-center justify-between gap-2 py-8 text-footnote text-label-secondary sm:flex-row">
        <p>Built by a theatre regular, for the theatre regulars.</p>
        <p>&copy; Stubbed</p>
      </Container>
    </footer>
  );
}
