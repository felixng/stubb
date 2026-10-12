import { Chip } from "@/components/ui/Chip";
import { RatingStars } from "@/components/ui/RatingStars";
import { Wordmark } from "@/components/ui/Wordmark";

// Static stand-in for the Instagram Story share card until the real card
// route (#15) exists; then the hero should render that instead.
export function ShareCardMock() {
  return (
    <div className="flex h-full flex-col bg-surface px-6 pt-12 pb-8 text-left">
      <div className="flex items-center justify-between">
        <Wordmark size={20} />
        <span className="text-caption text-ink-muted">@felix</span>
      </div>

      <div
        aria-hidden="true"
        className="mt-8 flex aspect-2/3 w-28 items-center justify-center rounded-md border border-border bg-surface-sunken font-display text-5xl font-bold text-border-strong"
      >
        H
      </div>

      <div className="mt-6 flex flex-col items-start gap-1">
        <Chip>Musical</Chip>
        <p className="mt-2 font-display text-heading text-ink">Hadestown</p>
        <p className="text-body text-ink-muted">
          Walter Kerr Theatre · 17 Oct 2026
        </p>
        <RatingStars value={4.5} size={20} className="mt-2" />
        <p className="mt-4 text-body-lg text-ink">
          “Wait for me” wrecked the whole row.
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <dt className="text-caption text-ink-muted">Shows this year</dt>
          <dd className="text-title text-ink tabular-nums">23</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">Venues</dt>
          <dd className="text-title text-ink tabular-nums">11</dd>
        </div>
      </dl>
    </div>
  );
}
