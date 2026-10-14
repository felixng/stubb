"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { CARD_DESIGNS, renderCard, type CardData } from "@/lib/share-card";
import { createClient } from "@/lib/supabase/client";

// Stubbed's Instagram account, tagged in the caption and the copied text.
const INSTAGRAM = "@stubbedapp";

type Rendered = { file: File; url: string };
type Variants = { photo: Rendered; clear: Rendered };

// Hevy-style share screen: swipe between card designs, optionally drop the
// background, then send the card in view to an Instagram story, the share
// sheet or the camera roll. Every card is drawn on the device, with and
// without its background, before any button is tapped, so the share sheet
// opens straight from the tap (iOS needs that).
export function ShareSheet({
  data,
  photoUrl,
  slug,
  editHref,
}: {
  data: CardData;
  photoUrl: string | null;
  slug: string;
  editHref?: string;
}) {
  const [cards, setCards] = useState<Variants[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [transparent, setTransparent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    const make = (blob: Blob, name: string): Rendered => {
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return { url, file: new File([blob], name, { type: "image/png" }) };
    };
    (async () => {
      const photo = photoUrl ? await loadPhoto(photoUrl) : null;
      const out: Variants[] = [];
      for (const design of CARD_DESIGNS) {
        const name = `stubbed-${slug}-${design.id}`;
        out.push({
          photo: make(await renderCard(design.id, data, photo), `${name}.png`),
          clear: make(await renderCard(design.id, data, null, { transparent: true }), `${name}-clear.png`),
        });
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

  const variants = cards?.[active];
  const card = variants && (transparent ? variants.clear : variants.photo);
  const canShareFiles =
    typeof navigator !== "undefined" && card ? Boolean(navigator.canShare?.({ files: [card.file] })) : false;
  const text = `${data.venue ? `${data.title} at ${data.venue}` : data.title}. Tracked on Stubbed ${INSTAGRAM}`;

  function goTo(i: number) {
    const el = scroller.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // One full-width card per page, so the page index is the card index.
  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(CARD_DESIGNS.length - 1, i)));
  }

  // Which button was used, on which design: the share loop's main signal.
  function record(action: "stories" | "more" | "download" | "copy_text") {
    void track(createClient(), "card_shared", { action, design: CARD_DESIGNS[active].id, transparent });
  }

  function saveImage() {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = card.file.name;
    a.click();
  }

  function download() {
    saveImage();
    record("download");
  }

  async function share(withText: boolean) {
    if (!card) return;
    setNotice(null);
    if (!canShareFiles) {
      saveImage();
      record(withText ? "more" : "stories");
      setNotice(withText ? "Image saved." : "Image saved. Add it to your story from Instagram.");
      return;
    }
    // Image only for stories: Instagram's share sheet entry drops the
    // image when text comes with it.
    try {
      await navigator.share(withText ? { files: [card.file], text } : { files: [card.file] });
      record(withText ? "more" : "stories");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Sharing failed", err);
      setNotice("Couldn’t open sharing. Download the image instead.");
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      record("copy_text");
      setNotice("Text copied.");
    } catch {
      setNotice("Couldn’t copy the text.");
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
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-scrollbar]:hidden"
      >
        {CARD_DESIGNS.map((design, i) => {
          const rendered = cards?.[i];
          const shown = rendered && (transparent ? rendered.clear : rendered.photo);
          return (
            <div
              key={design.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${CARD_DESIGNS.length}: ${design.name}`}
              className={`aspect-square w-full shrink-0 snap-center overflow-hidden rounded-[6%] ${transparent ? "bg-[repeating-conic-gradient(#5b5b5f_0%_25%,#47474a_0%_50%)] bg-[length:28px_28px]" : ""}`}
            >
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element -- local PNG drawn on the device
                <img
                  src={shown.url}
                  alt={`Share card, ${design.name.toLowerCase()}${transparent ? ", no background" : ""}: ${data.title}`}
                  className="size-full"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-fill text-subheadline text-label-secondary">
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

      <p className="text-center text-callout text-label">
        Share your show · Tag <span className="font-semibold">{INSTAGRAM}</span>
      </p>

      {/* Scrolls sideways on narrow phones, like Hevy's row. */}
      <div className="-mx-4 flex items-start gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Action
          label="Background"
          onClick={() => setTransparent((t) => !t)}
          disabled={!cards}
          pressed={!transparent}
        >
          <span
            className={`flex size-14 items-center justify-center rounded-pill text-white ${transparent ? "bg-[repeating-conic-gradient(#6b6b70_0%_25%,#48484c_0%_50%)] bg-[length:14px_14px]" : "bg-label"}`}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 13 13 5M5 19 19 5M11 19l8-8" />
            </svg>
          </span>
        </Action>
        <span aria-hidden="true" className="mt-1 h-12 w-px shrink-0 bg-separator" />
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
        <Action label="Copy text" onClick={copyText} disabled={false}>
          <Circle>
            <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
            <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
          </Circle>
        </Action>
        {editHref && (
          <Link href={editHref} className={ACTION}>
            <Circle>
              <path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5z" />
            </Circle>
            Edit
          </Link>
        )}
      </div>

      <p role="status" className="min-h-5 text-center text-footnote text-label-secondary">
        {notice}
      </p>
    </section>
  );
}

const ACTION =
  "flex w-[72px] shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-md text-footnote text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-40";

function Action({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={ACTION}
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
