// Trip recap share cards (#16), drawn on the device with Canvas 2D like the
// entry cards in share-card.ts. Designs: the "Share cards" canvas,
// https://claude.ai/artifact/JBrH9jzd4ke4YtpRLQWhPC, "Trip wrap" rows: list,
// photo grid, photo collage and the square trip wrap. All four are drawn
// square (1080 × 1080) with the square wrap's header and footer, so they
// match each other and the entry cards. Coordinates are in the designs'
// 540px units, scaled up to 1080.
import {
  CORAL,
  type Ctx,
  DISPLAY,
  drawStars,
  fit,
  SECONDARY,
  setFont,
  TEXT,
  wrap,
} from "@/lib/share-card";

export type TripCardShow = {
  title: string;
  venue: string | null;
  day: string; // "Sun 4 Oct"
  rating: number | null;
};

export type TripCardData = {
  name: string;
  dates: string; // "4–8 Oct 2026"
  place: string | null; // "New York", "3 cities", or null with no venues
  cities: number;
  handle: string | null;
  shows: TripCardShow[]; // logged shows, in date order
  venues: number;
  average: number | null;
};

export type TripCardDesign = { id: string; name: string };

export const TRIP_CARD_DESIGNS: TripCardDesign[] = [
  { id: "trip-list", name: "List" },
  { id: "trip-grid", name: "Photo grid" },
  { id: "trip-collage", name: "Collage" },
  { id: "trip-square", name: "Photos" },
];

// Every trip card is square, like the entry cards, so the carousel keeps
// one size as you swipe.
const W = 540;
const SCALE = 1080 / W;
const PAD = 28;
const INNER = W - PAD * 2;
const RADIUS = 20;
// The footer (wordmark and handle) is centred on this line on every card;
// content sits between the header and FOOTER_TOP - GAP.
const FOOTER_MID = W - PAD - 9;
const FOOTER_TOP = FOOTER_MID - 9;
const GAP = 16;

const DARK = {
  ground: "#000000",
  surface: "#1C1C1E",
  fill: "#2C2C2E",
  label: "#FFFFFF",
  secondary: SECONDARY,
  separator: "#38383A",
  outline: "#7C7C82",
  accent: CORAL,
};
const LIGHT = {
  ground: "#FFF9F6",
  surface: "#FFFFFF",
  fill: "#FFEBE3",
  label: "#1F1210",
  secondary: "#5E4039",
  separator: "#F9E0D6",
  outline: "#98695B",
  accent: "#B33A19", // tint-text: coral as text on light
};
type Palette = typeof DARK;

// `photos[i]` belongs to `data.shows[i]`; null where a show has none.
export async function renderTripCard(
  design: TripCardDesign["id"],
  data: TripCardData,
  photos: (HTMLImageElement | null)[],
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = W * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn’t available");
  ctx.scale(SCALE, SCALE);
  const shows = data.shows.map((s, i) => ({ ...s, photo: photos[i] ?? null }));
  const p = design === "trip-collage" || design === "trip-square" ? LIGHT : DARK;

  roundRect(ctx, 0, 0, W, W, RADIUS);
  ctx.fillStyle = p.ground;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (design === "trip-grid") drawGrid(ctx, p, data, shows);
  else if (design === "trip-collage") drawCollage(ctx, p, data, shows);
  else if (design === "trip-square") drawSquare(ctx, p, data, shows);
  else drawList(ctx, p, data, shows);
  drawFooter(ctx, p, data.handle);
  ctx.restore();
  strokeRound(ctx, 0, 0, W, W, RADIUS, p.separator);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn’t make the image"))), "image/png"),
  );
}

type Show = TripCardShow & { photo: HTMLImageElement | null };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Trip name, then "New York · 4–8 Oct 2026 · 4 shows" with the place in the
// accent colour. Returns the header's bottom edge.
function drawHeader(ctx: Ctx, p: Palette, d: TripCardData, count: number, top = PAD) {
  ctx.textBaseline = "middle";
  setFont(ctx, 700, 30, DISPLAY, 0.36);
  ctx.fillStyle = p.label;
  ctx.fillText(fit(ctx, d.name, INNER), PAD, top + 17);
  const subY = top + 34 + 2 + 9.5;
  let x = PAD;
  if (d.place) {
    setFont(ctx, 600, 14, TEXT, -0.17);
    ctx.fillStyle = p.accent;
    const place = fit(ctx, d.place, INNER / 2);
    ctx.fillText(place, x, subY);
    x += ctx.measureText(place).width + 4;
  }
  setFont(ctx, 400, 14, TEXT, -0.17);
  ctx.fillStyle = p.secondary;
  const rest = `${d.place ? "· " : ""}${d.dates} · ${plural(count, "show")}`;
  ctx.fillText(fit(ctx, rest, PAD + INNER - x), x, subY);
  return top + 34 + 2 + 19;
}

// "Trip wrap · list", squared: the trip's shows as rows. Up to 4 shows get
// photo rows; 5–6 compact rows; past 6, five rows and "+ N more shows".
function drawList(ctx: Ctx, p: Palette, d: TripCardData, shows: Show[]) {
  const top = drawHeader(ctx, p, d, shows.length) + GAP;
  const bottom = FOOTER_TOP - GAP;

  const compact = shows.length > 4;
  const rows = shows.length > 6 ? shows.slice(0, 5) : shows;
  const more = shows.length - rows.length;
  const rowH = compact ? 56 : 72;
  const moreH = more ? 40 : 0;
  const panelH = rows.length * rowH + (rows.length - 1) + (more ? 1 + moreH : 0);
  const y0 = top + (bottom - top - panelH) / 2;

  ctx.save();
  roundRect(ctx, PAD, y0, INNER, panelH, 12);
  ctx.fillStyle = p.surface;
  ctx.fill();
  ctx.clip();
  const starsW = 5 * 13 + 4 * 2;
  rows.forEach((s, i) => {
    const rowTop = y0 + i * (rowH + 1);
    if (i > 0) {
      ctx.fillStyle = p.separator;
      ctx.fillRect(PAD + (compact ? 14 : 70), rowTop - 1, INNER, 1);
    }
    const textX = compact ? PAD + 14 : PAD + 14 + 42 + 14;
    const rightEdge = PAD + INNER - 14;
    const textW = rightEdge - textX - (s.rating != null ? starsW + 12 : 0);
    if (!compact) drawThumb(ctx, p, s, PAD + 14, rowTop + 8, 42, 56);
    const blockH = 20 + 2 + 18;
    const ty = rowTop + (rowH - blockH) / 2;
    ctx.textBaseline = "middle";
    setFont(ctx, 600, 16, TEXT, -0.32);
    ctx.fillStyle = p.label;
    ctx.fillText(fit(ctx, s.title, textW), textX, ty + 10);
    setFont(ctx, 400, 13, TEXT, -0.08);
    ctx.fillStyle = p.secondary;
    ctx.fillText(fit(ctx, [s.venue, s.day].filter(Boolean).join(" · "), textW), textX, ty + 22 + 9);
    if (s.rating != null) drawStars(ctx, s.rating, rightEdge - starsW, rowTop + (rowH - 13) / 2, 13, 2, p.outline);
  });
  if (more) {
    const moreTop = y0 + rows.length * (rowH + 1);
    ctx.fillStyle = p.separator;
    ctx.fillRect(PAD, moreTop - 1, INNER, 1);
    setFont(ctx, 400, 14, TEXT, -0.17);
    ctx.fillStyle = p.secondary;
    ctx.fillText(`+ ${plural(more, "more show")}`, PAD + 14, moreTop + moreH / 2);
  }
  ctx.restore();
  strokeRound(ctx, PAD, y0, INNER, panelH, 12, p.separator);
}

// "Trip wrap · photo grid", squared: a big coral count with the trip's
// stats beside it, then the photos.
function drawGrid(ctx: Ctx, p: Palette, d: TripCardData, shows: Show[]) {
  // Stats column, right aligned: place, theatres, average rating.
  const stats: { value: string | number; label: string }[] = [];
  if (d.place) stats.push({ value: d.place, label: d.cities > 1 ? "visited" : "city" });
  if (d.venues) stats.push({ value: plural(d.venues, "theatre"), label: "visited" });
  if (d.average != null) stats.push({ value: d.average, label: "average rating" });
  let sy = PAD;
  let statsW = 0;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const s of stats) {
    if (typeof s.value === "number") {
      drawStars(ctx, s.value, PAD + INNER - 73, sy + 3.5, 13, 2, p.outline);
      statsW = Math.max(statsW, 73);
    } else {
      setFont(ctx, 600, 15, TEXT, -0.24);
      ctx.fillStyle = p.label;
      const v = fit(ctx, s.value, 160);
      statsW = Math.max(statsW, ctx.measureText(v).width);
      ctx.fillText(v, PAD + INNER, sy + 10);
    }
    setFont(ctx, 400, 11, TEXT, 0.06);
    ctx.fillStyle = p.secondary;
    ctx.fillText(s.label, PAD + INNER, sy + 20 + 7);
    sy += 20 + 14 + 4;
  }
  ctx.textAlign = "left";

  // Count, top left.
  const leftW = INNER - statsW - 16;
  setFont(ctx, 400, 13, TEXT, -0.08);
  ctx.fillStyle = p.secondary;
  ctx.fillText(fit(ctx, `${d.name} · ${d.dates}`, leftW), PAD, PAD + 9);
  setFont(ctx, 800, 72, DISPLAY, -2.16);
  ctx.fillStyle = CORAL;
  ctx.textBaseline = "alphabetic";
  const count = String(shows.length);
  const baseline = PAD + 18 + 62;
  ctx.fillText(count, PAD, baseline);
  const countW = ctx.measureText(count).width;
  setFont(ctx, 400, 16, TEXT, -0.32);
  ctx.fillStyle = p.secondary;
  ctx.fillText(shows.length === 1 ? "show" : "shows", PAD + countW + 8, baseline);

  const top = Math.max(PAD + 18 + 72, sy - 4) + GAP;
  drawPhotoGrid(ctx, p, shows, PAD, top, INNER, FOOTER_TOP - GAP - top, false);
}

// Polaroid positions from the canvas (frame's top left in a 460 × 446 box,
// rotation), for up to four shows; one show sits centred. Scaled to fit.
const POLAROIDS = [
  { left: 36, top: 0, rotate: -3 },
  { left: 256, top: 12, rotate: -2 },
  { left: 24, top: 212, rotate: 3 },
  { left: 244, top: 222, rotate: -3 },
];
const SOLO = { left: 146, top: 0, rotate: -3 };

// "Trip wrap · photo collage", squared: up to four polaroids, shows with
// photos first.
function drawCollage(ctx: Ctx, p: Palette, d: TripCardData, shows: Show[]) {
  const top = drawHeader(ctx, p, d, shows.length) + GAP;
  const bottom = FOOTER_TOP - GAP;
  const picks = [...shows].sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo))).slice(0, 4);
  const more = shows.length - picks.length;
  const boxW = 460;
  const boxH = picks.length > 2 ? 446 : 236;
  // Fill the space: a lone polaroid can grow; a row of two stays in width.
  const k = Math.min(picks.length === 1 ? 1.4 : INNER / boxW, (bottom - top) / boxH);
  const x0 = PAD + (INNER - boxW * k) / 2;
  const y0 = top + (bottom - top - boxH * k) / 2;
  picks.forEach((s, i) => {
    const at = picks.length === 1 ? SOLO : POLAROIDS[i];
    const fw = 168 * k;
    const fh = 224 * k;
    ctx.save();
    ctx.translate(x0 + at.left * k + fw / 2, y0 + at.top * k + fh / 2);
    ctx.rotate((at.rotate * Math.PI) / 180);
    ctx.translate(-fw / 2, -fh / 2);
    softShadow(ctx);
    roundRect(ctx, 0, 0, fw, fh, 4);
    ctx.fillStyle = p.surface;
    ctx.fill();
    noShadow(ctx);
    strokeRound(ctx, 0, 0, fw, fh, 4, p.separator);
    drawTile(ctx, p, s, 4, 4, fw - 8, fh - 8, 2, i === picks.length - 1 ? more : 0);
    ctx.restore();
  });
}

// "Square · trip wrap": the trip's photos in a grid.
function drawSquare(ctx: Ctx, p: Palette, d: TripCardData, shows: Show[]) {
  const top = drawHeader(ctx, p, d, shows.length) + GAP;
  drawPhotoGrid(ctx, p, shows, PAD, top, INNER, FOOTER_TOP - GAP - top, true);
}

// --- shared pieces ---------------------------------------------------------

// Rows of tiles: 1, 2, 1+2, 2+2, 2+3, 3+3; past 6 the last tile reads "+N".
const ROWS: Record<number, number[]> = { 1: [1], 2: [2], 3: [1, 2], 4: [2, 2], 5: [2, 3], 6: [3, 3] };

function drawPhotoGrid(ctx: Ctx, p: Palette, all: Show[], x: number, y: number, w: number, h: number, shadow: boolean) {
  const gap = 8;
  const shows = all.slice(0, 6);
  const more = all.length - shows.length;
  const rows = ROWS[shows.length] ?? [];
  const rowH = (h - gap * (rows.length - 1)) / rows.length;
  let i = 0;
  rows.forEach((count, r) => {
    const tileW = (w - gap * (count - 1)) / count;
    for (let c = 0; c < count; c++, i++) {
      const tx = x + c * (tileW + gap);
      const ty = y + r * (rowH + gap);
      if (shadow) {
        ctx.save();
        softShadow(ctx);
        roundRect(ctx, tx, ty, tileW, rowH, 8);
        ctx.fillStyle = p.surface;
        ctx.fill();
        ctx.restore();
      }
      drawTile(ctx, p, shows[i], tx, ty, tileW, rowH, 8, i === shows.length - 1 ? more : 0);
      strokeRound(ctx, tx, ty, tileW, rowH, 8, p.separator);
    }
  });
}

// A show's photo, or its title set large on `fill` when it has none.
function drawTile(ctx: Ctx, p: Palette, s: Show, x: number, y: number, w: number, h: number, r: number, more: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  if (s.photo) cover(ctx, s.photo, x, y, w, h);
  else {
    ctx.fillStyle = p.fill;
    ctx.fillRect(x, y, w, h);
    const size = Math.max(17, Math.min(28, w / 8));
    setFont(ctx, 700, size, DISPLAY, size * -0.01);
    const lh = size * 1.1;
    let lines = wrap(ctx, s.title, w - 32);
    if (lines.length > 3) lines = [lines[0], lines[1], fit(ctx, lines.slice(2).join(" "), w - 32)];
    ctx.fillStyle = p.label;
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      ctx.fillText(fit(ctx, line, w - 32), x + 16, y + h - 16 - lh * (lines.length - i) + lh / 2);
    });
  }
  if (more) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(x, y, w, h);
    setFont(ctx, 800, 34, DISPLAY, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${more}`, x + w / 2, y + h / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

// The list's 56×74 thumbnail; the show's initials in `outline` without a
// photo, like Poster.
function drawThumb(ctx: Ctx, p: Palette, s: Show, x: number, y: number, w: number, h: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 8);
  ctx.clip();
  if (s.photo) cover(ctx, s.photo, x, y, w, h);
  else {
    ctx.fillStyle = p.fill;
    ctx.fillRect(x, y, w, h);
    const words = s.title.split(/\s+/).filter(Boolean);
    setFont(ctx, 700, 20, DISPLAY, 0);
    ctx.fillStyle = p.outline;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((words[0]?.[0] ?? "") + (words[1]?.[0] ?? ""), x + w / 2, y + h / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

// Wordmark left, handle right, at the same place on every card.
function drawFooter(ctx: Ctx, p: Palette, handle: string | null) {
  ctx.textBaseline = "middle";
  setFont(ctx, 800, 18, DISPLAY, -0.81);
  ctx.fillStyle = p.label;
  ctx.fillText("stubbed", PAD, FOOTER_MID);
  if (handle) {
    setFont(ctx, 400, 13, TEXT, -0.08);
    ctx.fillStyle = p.secondary;
    ctx.textAlign = "right";
    ctx.fillText(`@${handle}`, W - PAD, FOOTER_MID);
    ctx.textAlign = "left";
  }
}

// object-fit: cover, centred.
function cover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * scale;
  const ih = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function strokeRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string) {
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Footlight's warm card shadow. Offsets and blur are in canvas pixels.
function softShadow(ctx: Ctx) {
  ctx.shadowColor = "rgba(120, 50, 30, 0.28)";
  ctx.shadowBlur = 22 * SCALE;
  ctx.shadowOffsetY = 10 * SCALE;
}

function noShadow(ctx: Ctx) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}
