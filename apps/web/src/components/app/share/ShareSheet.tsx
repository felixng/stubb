"use client";

import { useEffect, useRef, useState } from "react";

import { CARD_DESIGNS, renderCard, type CardData } from "@/lib/share-card";

type Rendered = { id: string; name: string; file: File; url: string };

// Hevy-style share screen: swipe between card designs, then send the one in
// view to an Instagram story, the share sheet, or the camera roll. Cards are
// drawn on the device as PNGs before any button is tapped, so the share
// sheet opens straight from the tap (iOS needs that).
export function ShareSheet({ data, photoUrl, slug }: { data: CardData; photoUrl: string | null; slug: string }) {
  const [cards, setCards] = useState<Rendered[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      const photo = photoUrl ? await loadPhoto(photoUrl) : null;
      const out: Rendered[] = [];
      for (const design of CARD_DESIGNS) {
        const blob = await renderCard(design.id, data, photo);
        const url = URL.createObjectURL(blob);
        urls.push(url);
        out.push({ ...design, url, file: new File([blob], `stubbed-${slug}-${design.id}.png`, { type: "image/png" }) });
      }
      if (photo) URL.revokeObjectURL(photo.src);
      if (!cancelled) setCards(out);
    })().catch((err) => {
      console.error("Drawing the share cards failed", err);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [data, photoUrl, slug]);

  const card = cards?.[active];
  const canShareFiles =
    typeof navigator !== "undefined" && card ? Boolean(navigator.canShare?.({ files: [card.file] })) : false;

  function goTo(i: number) {
    const el = scroller.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / (el.scrollWidth / CARD_DESIGNS.length));
    setActive(Math.max(0, Math.min(CARD_DESIGNS.length - 1, i)));
  }

  function download() {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = card.file.name;
    a.click();
  }

  async function share(withText: boolean) {
    if (!card) return;
    setNotice(null);
    if (!canShareFiles) {
      download();
      setNotice(withText ? "Image saved." : "Image saved. Add it to your story from Instagram.");
      return;
    }
    // Image only for stories: Instagram's share sheet entry drops the
    // image when text comes with it.
    const text = `${data.title} at ${data.venue}. Logged on Stubbed.`;
    try {
      await navigator.share(withText ? { files: [card.file], text } : { files: [card.file] });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Sharing failed", err);
      setNotice("Couldn’t open sharing. Download the image instead.");
    }
  }

  return (
    <section aria-label="Share" className="flex flex-col gap-4">
      <div
        ref={scroller}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Card designs"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[8%] pb-1 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-focus [&::-webkit-scrollbar]:hidden"
      >
        {CARD_DESIGNS.map((design, i) => {
          const rendered = cards?.[i];
          return (
            <div
              key={design.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${CARD_DESIGNS.length}: ${design.name}`}
              className="aspect-square w-[84%] shrink-0 snap-center"
            >
              {rendered ? (
                // eslint-disable-next-line @next/next/no-img-element -- local PNG drawn on the device
                <img
                  src={rendered.url}
                  alt={`Share card, ${design.name.toLowerCase()}: ${data.title}`}
                  className="size-full drop-shadow-md"
                />
              ) : (
                <div className="flex size-full items-center justify-center rounded-lg bg-fill text-subheadline text-label-secondary">
                  {failed ? "Couldn’t draw this card." : "Drawing…"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-1">
        {CARD_DESIGNS.map((design, i) => (
          <button
            key={design.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show card ${i + 1}, ${design.name}`}
            aria-current={i === active}
            className="flex size-6 items-center justify-center rounded-pill focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span className={`block size-2 rounded-pill ${i === active ? "bg-tint" : "bg-outline/40"}`} />
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-6 pt-1">
        <Action label="Stories" onClick={() => share(false)} disabled={!card}>
          <span className="flex size-14 items-center justify-center rounded-pill bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285aeb_90%)] text-white">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
            </svg>
          </span>
        </Action>
        <Action label="More" onClick={() => share(true)} disabled={!card}>
          <Circle>
            <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M6 11.5H5v9h14v-9h-1" />
          </Circle>
        </Action>
        <Action label="Download" onClick={download} disabled={!card}>
          <Circle>
            <path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
          </Circle>
        </Action>
      </div>

      <p role="status" className="min-h-5 text-center text-footnote text-label-secondary">
        {notice}
      </p>
    </section>
  );
}

function Action({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-16 cursor-pointer flex-col items-center gap-1.5 rounded-md text-footnote text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-40"
    >
      {children}
      {label}
    </button>
  );
}

function Circle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-14 items-center justify-center rounded-pill bg-fill text-label">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

// The photo is fetched into a blob first, so drawing it never taints the
// canvas. No photo, or it fails: the cards use their plain background.
async function loadPhoto(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const src = URL.createObjectURL(await res.blob());
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}
