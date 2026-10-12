// Static stand-in for the Instagram Story share card until the real card
// route (#15) exists; then the hero should render that instead.
// Fixed dark palette: a share card looks the same in light and dark mode.

function Stars({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-1 text-2xl leading-none"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = rating >= n ? 100 : rating >= n - 0.5 ? 50 : 0;
        return (
          <span key={n} className="relative text-white/20" aria-hidden="true">
            ★
            <span
              className="absolute inset-0 overflow-hidden text-[#e0bc4c]"
              style={{ width: `${fill}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ShareCardMock() {
  return (
    <div className="flex h-full flex-col bg-[radial-gradient(120%_70%_at_50%_0%,#9b1d30_0%,#3a0d16_55%,#141012_100%)] px-6 pt-12 pb-8 text-left text-[#f4ece0]">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] uppercase text-[#f4ece0]/70">
        <span>Stubbed</span>
        <span className="tracking-normal normal-case text-[#e0bc4c]">@felix</span>
      </div>

      <div className="mt-16">
        <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#e0bc4c]">
          Musical
        </p>
        <p className="mt-2 font-display text-4xl leading-none font-semibold tracking-tight">
          Hadestown
        </p>
        <p className="mt-4 text-sm text-[#f4ece0]/80">Walter Kerr Theatre</p>
        <p className="font-mono text-xs text-[#f4ece0]/60">Sat 17 Oct 2026</p>
        <div className="mt-5">
          <Stars rating={4.5} />
        </div>
        <p className="mt-5 font-display text-base leading-snug text-[#f4ece0]/90 italic">
          “Wait for me” wrecked the whole row.
        </p>
      </div>

      {/* Perforated tear line, as on a ticket stub. */}
      <div className="relative my-7 border-t-2 border-dashed border-[#f4ece0]/25">
        <span className="absolute -top-3 -left-9 size-6 rounded-full bg-[#141012]" />
        <span className="absolute -top-3 -right-9 size-6 rounded-full bg-[#141012]" />
      </div>

      <dl className="grid grid-cols-2 gap-4 font-mono">
        <div>
          <dt className="text-[9px] tracking-[0.2em] uppercase text-[#f4ece0]/50">
            Shows this year
          </dt>
          <dd className="mt-1 text-xl font-semibold">23</dd>
        </div>
        <div>
          <dt className="text-[9px] tracking-[0.2em] uppercase text-[#f4ece0]/50">
            Avg rating
          </dt>
          <dd className="mt-1 text-xl font-semibold">4.1</dd>
        </div>
      </dl>
    </div>
  );
}
