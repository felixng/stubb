import { Container } from "@/components/landing/Container";

const FEATURES = [
  {
    title: "Log every show",
    body: "Venue, date and a line or two on what you thought.",
  },
  {
    title: "Rate it",
    body: "Half stars, so a four and a four and a half are different nights.",
  },
  {
    title: "Group shows into trips",
    body: "A week in New York or a season at the Barbican, together.",
  },
  {
    title: "Share them",
    body: "See what your friends are seeing, and what is trending.",
  },
];

export function Features() {
  return (
    <section aria-label="What you can do" className="pt-6 pb-20">
      <Container>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-2 rounded-lg border border-separator bg-surface p-6 shadow-sm"
            >
              <h2 className="font-display text-[20px] leading-7 font-bold text-label">
                {feature.title}
              </h2>
              <p className="text-body text-label-secondary">{feature.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
