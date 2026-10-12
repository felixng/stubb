import { useId } from "react";

import { Container } from "@/components/landing/Container";
import { PhoneFrame } from "@/components/landing/PhoneFrame";
import { ShareCardMock } from "@/components/landing/ShareCardMock";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

// Layout adapted from the Tailwind Plus "Pocket" hero.

function BackgroundIllustration(props: React.ComponentPropsWithoutRef<"div">) {
  const id = useId();

  return (
    <div {...props}>
      <svg
        viewBox="0 0 1026 1026"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full animate-spin-slow motion-reduce:animate-none"
      >
        <path
          d="M1025 513c0 282.77-229.23 512-512 512S1 795.77 1 513 230.23 1 513 1s512 229.23 512 512Z"
          className="stroke-border"
        />
        <path
          d="M513 1025C230.23 1025 1 795.77 1 513"
          stroke={`url(#${id}-gradient-1)`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id={`${id}-gradient-1`}
            x1="1"
            y1="513"
            x2="1"
            y2="1025"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--border-strong)" />
            <stop offset="1" stopColor="var(--border-strong)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        viewBox="0 0 1026 1026"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full animate-spin-reverse-slower motion-reduce:animate-none"
      >
        <path
          d="M913 513c0 220.914-179.086 400-400 400S113 733.914 113 513s179.086-400 400-400 400 179.086 400 400Z"
          className="stroke-border"
        />
        <path
          d="M913 513c0 220.914-179.086 400-400 400"
          stroke={`url(#${id}-gradient-2)`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id={`${id}-gradient-2`}
            x1="913"
            y1="513"
            x2="913"
            y2="913"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--border-strong)" />
            <stop offset="1" stopColor="var(--border-strong)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function Hero() {
  return (
    <div className="overflow-hidden pt-10 pb-16 sm:pt-20 sm:pb-24 lg:pb-32 xl:pb-36">
      <Container>
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20">
          <div className="relative z-10 mx-auto max-w-2xl lg:col-span-7 lg:max-w-none lg:pt-6 xl:col-span-6">
            <p className="text-label tracking-[0.08em] text-ink-muted uppercase">
              For theatre regulars
            </p>
            <h1 className="mt-3 font-display text-display-lg text-ink sm:text-display-xl">
              Your theatre life, shared.
            </h1>
            <p className="mt-4 text-body-lg text-ink-muted">
              Log and rate the shows you see, and see what’s trending in the
              theatre community. Your diary, and the people who get it.
            </p>
            <div className="mt-8">
              <WaitlistForm />
              <p className="text-caption text-ink-muted">
                We’ll only email you about launch. Unsubscribe anytime.
              </p>
            </div>
          </div>
          <div className="relative mt-10 sm:mt-20 lg:col-span-5 lg:row-span-2 lg:mt-0 xl:col-span-6">
            <BackgroundIllustration className="absolute top-4 left-1/2 h-[1026px] w-[1026px] -translate-x-1/3 mask-[linear-gradient(to_bottom,white_20%,transparent_75%)] sm:top-16 sm:-translate-x-1/2 lg:-top-16 lg:ml-12 xl:-top-14 xl:ml-0" />
            <div className="-mx-4 h-[520px] mask-[linear-gradient(to_bottom,white_70%,transparent)] px-9 sm:mx-0 lg:absolute lg:-inset-x-10 lg:-top-10 lg:-bottom-20 lg:h-auto lg:px-0 lg:pt-10 xl:-bottom-32">
              <PhoneFrame className="mx-auto max-w-[366px]" priority>
                <ShareCardMock />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
