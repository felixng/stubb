import { Container } from "@/components/landing/Container";
import { PhoneFrame } from "@/components/landing/PhoneFrame";
import { DiaryScreenMock } from "@/components/landing/DiaryScreenMock";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { Chip } from "@/components/ui/Chip";

// Static chips under the subhead: short, sentence case, no numbers.
const HIGHLIGHTS = [
  "Log in seconds",
  "Instagram share cards",
  "Trips and stats",
];

export function Hero() {
  return (
    <section className="overflow-hidden pt-8 pb-16 sm:pb-20">
      <Container className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-[1_1_520px]">
          <p className="inline-flex min-h-8 items-center self-start rounded-pill border border-separator bg-surface px-3.5 text-footnote font-medium tracking-[0.08em] text-label-secondary uppercase shadow-sm">
            For the theatre regulars
          </p>
          <h1 className="font-display text-[clamp(44px,7vw,76px)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance text-label">
            Your theatre life, shared.
          </h1>
          <p className="max-w-[480px] text-[20px] leading-7 text-label-secondary">
            Log and rate the shows you see, and see what is trending in the
            theatre community. Your diary, and the people who get it.
          </p>
          <ul aria-label="Features" className="flex flex-wrap gap-2">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight}>
                <Chip>{highlight}</Chip>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-col gap-1">
            <WaitlistForm />
            <p className="text-footnote text-label-secondary">
              One email, at launch. Unsubscribe any time.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 justify-center lg:flex-[1_1_400px]">
          <div className="relative flex w-full max-w-[480px] justify-center py-10">
            {/* Decorative halo: a `glow` circle with a soft tint ring. */}
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 aspect-square w-[min(100%,460px)] -translate-1/2 rounded-full bg-glow shadow-[0_0_0_28px_color-mix(in_srgb,var(--tint)_16%,transparent)]"
            />
            <div className="relative h-[460px] w-[310px] overflow-hidden mask-[linear-gradient(to_bottom,white_80%,transparent)]">
              <PhoneFrame priority>
                <DiaryScreenMock />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
