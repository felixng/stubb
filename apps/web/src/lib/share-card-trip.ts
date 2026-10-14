// Trip recap share cards (#16), drawn on the device with Canvas 2D like the
// entry cards in share-card.ts. Designs: the "Share cards" canvas,
// https://claude.ai/artifact/JBrH9jzd4ke4YtpRLQWhPC, "Trip wrap" rows: list,
// photo grid and photo collage (Story 9:16) and the square trip wrap (1:1).
// Coordinates are in the designs' 540px-wide units, scaled up to 1080.
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

export type TripCardDesign = { id: string; name: string; story: boolean };

export const TRIP_CARD_DESIGNS: TripCardDesign[] = [
  { id: "trip-list", name: "List", story: true },
  { id: "trip-grid", name: "Photo grid", story: true },
  { id: "trip-collage", name: "Collage", story: true },
  { id: "trip-square", name: "Square", story: false },
];

const W = 540;
const STORY_H = 960;
const SCALE = 1080 / W;
// Instagram Story safe area: its UI covers the top 132 and bottom 184 units.
const SAFE_TOP = 132;
const SAFE_BOTTOM = STORY_H - 184;

const DARK = { ground: "#000000", surface: "#1C1C1E", fill: "#2C2C2E", label: "#FFFFFF", secondary: SECONDARY, separator: "#38383A", outline: "#7C7C82" };
const LIGHT = { ground: "#FFF9F6", surface: "#FFFFFF", fill: "#FFEBE3", label: "#1F1210", secondary: "#5E4039", separator: "#F9E0D6", outline: "#98695B", tintText: "#B33A19" };
type Palette = typeof DARK;

// `photos[i]` belongs to `data.shows[i]`; null where a show has none.
export async function renderTripCard(design: TripCardDesign["id"], data: TripCardData, photos: (HTMLImageElement | null)[]) {
  const story = TRIP_CARD_DESIGNS.find((d) => d.id === design)?.story ?? true;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = (story ? STORY_H : W) * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn’t available");
  ctx.scale(SCALE, SCALE);
  const shows = data.shows.map((s, i) => ({ ...s, photo: photos[i] ?? null }));
  if (design === "trip-grid") drawGrid(ctx, data, shows);
  else if (design === "trip-collage") drawCollage(ctx, data, shows);
  else if (design === "trip-square") drawSquare(ctx, data, shows);
  else drawList(ctx, data, shows);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn’t make the image"))), "image/png"),
  );
}

type Show = TripCardShow & { photo: HTMLImageElement | null };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "Trip wrap · list": dark, a pill, the trip's name and a list of its shows.
// Up to 5 shows get photo rows; more switch to compact rows, and past 7 the
// last row reads "+ N more shows".
function drawList(ctx: Ctx, d: TripCardData, shows: Show[]) {
  const p = DARK;
  const x = 32;
  const inner = W - x * 2;
  fillAll(ctx, p.ground, STORY_H);

  // Header, top down.
  const pill = d.place ? `${plural(shows.length, "show")} in ${d.place}` : plural(shows.length, "show");
  setFont(ctx, 600, 13, TEXT, -0.08);
  const pillW = Math.min(ctx.measureText(pill).width + 24, inner);
  ctx.fillStyle = CORAL;
  roundRect(ctx, x, SAFE_TOP, pillW, 28, 14);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  ctx.fillText(fit(ctx, pill, pillW - 24), x + 12, SAFE_TOP + 14);
  let y = SAFE_TOP + 28 + 12;
  setFont(ctx, 700, 48, DISPLAY, -0.48);
  ctx.fillStyle = p.label;
  ctx.fillText(fit(ctx, d.name, inner), x, y + 26);
  y += 52 + 4;
  setFont(ctx, 400, 15, TEXT, -0.24);
  ctx.fillStyle = p.secondary;
  ctx.fillText(d.dates, x, y + 10);
  const headerBottom = y + 20;

  drawFooter(ctx, p, d.handle, x, SAFE_BOTTOM - 10, 20);

  // The list panel, centred between header and footer.
  const compact = shows.length > 5;
  const rows = shows.length > 7 ? shows.slice(0, 6) : shows;
  const more = shows.length - rows.length;
  const rowH = compact ? 60 : 90;
  const moreH = more ? 44 : 0;
  const panelH = rows.length * rowH + (rows.length - 1) + (more ? 1 + moreH : 0);
  const top = headerBottom + (SAFE_BOTTOM - 20 - headerBottom - panelH) / 2;
  ctx.save();
  roundRect(ctx, x, top, inner, panelH, 12);
  ctx.fillStyle = p.surface;
  ctx.fill();
  ctx.clip();

  const starsW = 5 * 14 + 4 * 2;
  rows.forEach((s, i) => {
    const rowTop = top + i * (rowH + 1);
    if (i > 0) {
      ctx.fillStyle = p.separator;
      ctx.fillRect(x + (compact ? 16 : 88), rowTop - 1, inner, 1);
    }
    const textX = compact ? x + 16 : x + 16 + 56 + 16;
    const textW = compact ? inner - 32 - (s.rating != null ? starsW + 16 : 0) : x + inner - 16 - textX;
    if (!compact) drawThumb(ctx, p, s, x + 16, rowTop + 8, 56, 74);
    const blockH = 22 + 2 + 20 + (!compact && s.rating != null ? 2 + 14 : 0);
    let ty = rowTop + (rowH - blockH) / 2;
    ctx.textBaseline = "middle";
    setFont(ctx, 600, 17, TEXT, -0.41);
    ctx.fillStyle = p.label;
    ctx.fillText(fit(ctx, s.title, textW), textX, ty + 11);
    ty += 22 + 2;
    setFont(ctx, 400, 15, TEXT, -0.24);
    ctx.fillStyle = p.secondary;
    ctx.fillText(fit(ctx, [s.venue, s.day].filter(Boolean).join(" · "), textW), textX, ty + 10);
    ty += 20 + 2;
    if (s.rating != null) {
      if (compact) drawStars(ctx, s.rating, x + inner - 16 - starsW, rowTop + (rowH - 14) / 2, 14, 2, p.outline);
      else drawStars(ctx, s.rating, textX, ty, 14, 2, p.outline);
    }
  });
  if (more) {
    const moreTop = top + rows.length * (rowH + 1);
    ctx.fillStyle = p.separator;
    ctx.fillRect(x, moreTop - 1, inner, 1);
    setFont(ctx, 400, 15, TEXT, -0.24);
    ctx.fillStyle = p.secondary;
    ctx.fillText(`+ ${plural(more, "more show")}`, x + 16, moreTop + moreH / 2);
  }
  ctx.restore();
  strokeRound(ctx, x, top, inner, panelH, 12, p.separator);
}

// "Trip wrap · photo grid": dark, a big coral count, stats on the right and
// the shows' photos.
function drawGrid(ctx: Ctx, d: TripCardData, shows: Show[]) {
  const p = DARK;
  const x = 40;
  const inner = W - x * 2;
  fillAll(ctx, p.ground, STORY_H);

  // Stats column, right aligned: place, theatres, average rating.
  const stats: { value: string | number; label: string }[] = [];
  if (d.place) stats.push({ value: d.place, label: d.cities > 1 ? "visited" : "city" });
  if (d.venues) stats.push({ value: plural(d.venues, "theatre"), label: "visited" });
  if (d.average != null) stats.push({ value: d.average, label: "average rating" });
  let sy = SAFE_TOP;
  let statsW = 0;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const s of stats) {
    if (typeof s.value === "number") {
      drawStars(ctx, s.value, x + inner - 78, sy + 4, 14, 2, p.outline);
      statsW = Math.max(statsW, 78);
    } else {
      setFont(ctx, 600, 17, TEXT, -0.41);
      ctx.fillStyle = p.label;
      const v = fit(ctx, s.value, 160);
      statsW = Math.max(statsW, ctx.measureText(v).width);
      ctx.fillText(v, x + inner, sy + 11);
    }
    setFont(ctx, 400, 12, TEXT, 0);
    ctx.fillStyle = p.secondary;
    ctx.fillText(s.label, x + inner, sy + 22 + 8);
    sy += 22 + 16 + 4;
  }
  ctx.textAlign = "left";

  // Count, top left.
  const leftW = inner - statsW - 16;
  setFont(ctx, 400, 13, TEXT, -0.08);
  ctx.fillStyle = p.secondary;
  ctx.fillText(fit(ctx, `${d.name} · ${d.dates}`, leftW), x, SAFE_TOP + 9);
  setFont(ctx, 800, 96, DISPLAY, -2.88);
  ctx.fillStyle = CORAL;
  ctx.textBaseline = "alphabetic";
  const count = String(shows.length);
  const baseline = SAFE_TOP + 18 + 82;
  ctx.fillText(count, x, baseline);
  const countW = ctx.measureText(count).width;
  setFont(ctx, 400, 17, TEXT, -0.41);
  ctx.fillStyle = p.secondary;
  ctx.fillText(shows.length === 1 ? "show" : "shows", x + countW + 8, baseline);
  const headerBottom = Math.max(SAFE_TOP + 18 + 96, sy - 4);

  drawFooter(ctx, p, d.handle, x, SAFE_BOTTOM - 10, 20);
  const gridH = 408;
  drawPhotoGrid(ctx, p, shows, x, headerBottom + (SAFE_BOTTOM - 20 - headerBottom - gridH) / 2, inner, gridH, false);
}

// Polaroid positions from the canvas (frame's top left, rotation), for up
// to four shows; one show sits centred.
const POLAROIDS = [
  { left: 36, top: 0, rotate: -3 },
  { left: 256, top: 12, rotate: -2 },
  { left: 24, top: 212, rotate: 3 },
  { left: 244, top: 222, rotate: -3 },
];
const SOLO = { left: 146, top: 0, rotate: -3 };

// "Trip wrap · photo collage": light, the trip's name and up to four
// polaroids, shows with photos first.
function drawCollage(ctx: Ctx, d: TripCardData, shows: Show[]) {
  const p = LIGHT;
  const x = 40;
  const inner = W - x * 2;
  fillAll(ctx, p.ground, STORY_H);

  let y = SAFE_TOP;
  ctx.textBaseline = "middle";
  setFont(ctx, 700, 48, DISPLAY, -0.48);
  ctx.fillStyle = p.label;
  ctx.fillText(fit(ctx, d.name, inner), x, y + 26);
  y += 52;
  if (d.place) {
    setFont(ctx, 600, 17, TEXT, -0.41);
    ctx.fillStyle = p.tintText;
    ctx.fillText(fit(ctx, d.place, inner), x, y + 4 + 11);
    y += 4 + 22;
  }
  setFont(ctx, 400, 15, TEXT, -0.24);
  ctx.fillStyle = p.secondary;
  ctx.fillText(`${d.dates} · ${plural(shows.length, "show")}`, x, y + 2 + 10);
  const headerBottom = y + 2 + 20;

  drawFooter(ctx, p, d.handle, x, SAFE_BOTTOM - 10, 20);

  const picks = [...shows].sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo))).slice(0, 4);
  const more = shows.length - picks.length;
  const boxH = picks.length > 2 ? 446 : 236;
  const boxTop = headerBottom + (SAFE_BOTTOM - 20 - headerBottom - boxH) / 2;
  picks.forEach((s, i) => {
    const at = picks.length === 1 ? SOLO : POLAROIDS[i];
    const fw = 168;
    const fh = 224;
    ctx.save();
    ctx.translate(x + at.left + fw / 2, boxTop + at.top + fh / 2);
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

// "Square · trip wrap": light 1:1 with rounded corners, a photo grid.
function drawSquare(ctx: Ctx, d: TripCardData, shows: Show[]) {
  const p = LIGHT;
  const pad = 28;
  const inner = W - pad * 2;
  roundRect(ctx, 0, 0, W, W, 20);
  ctx.fillStyle = p.ground;
  ctx.fill();
  ctx.save();
  ctx.clip();

  ctx.textBaseline = "middle";
  setFont(ctx, 700, 30, DISPLAY, 0.36);
  ctx.fillStyle = p.label;
  ctx.fillText(fit(ctx, d.name, inner), pad, pad + 17);
  const subY = pad + 34 + 2 + 9.5;
  let sx = pad;
  if (d.place) {
    setFont(ctx, 600, 14, TEXT, -0.17);
    ctx.fillStyle = p.tintText;
    const place = fit(ctx, d.place, inner / 2);
    ctx.fillText(place, sx, subY);
    sx += ctx.measureText(place).width + 4;
  }
  setFont(ctx, 400, 14, TEXT, -0.17);
  ctx.fillStyle = p.secondary;
  ctx.fillText(
    fit(ctx, `${d.place ? "· " : ""}${d.dates} · ${plural(shows.length, "show")}`, pad + inner - sx),
    sx,
    subY,
  );

  const gridTop = pad + 34 + 2 + 19 + 16;
  const footerMid = W - pad - 9;
  drawPhotoGrid(ctx, p, shows, pad, gridTop, inner, footerMid - 9 - 16 - gridTop, true);
  drawFooter(ctx, p, d.handle, pad, footerMid, 18);
  ctx.restore();
  strokeRound(ctx, 0.5, 0.5, W - 1, W - 1, 20, p.separator);
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

// Wordmark left, handle right, both centred on `mid`.
function drawFooter(ctx: Ctx, p: Palette, handle: string | null, x: number, mid: number, size: number) {
  ctx.textBaseline = "middle";
  setFont(ctx, 800, size, DISPLAY, -0.045 * size);
  ctx.fillStyle = p.label;
  ctx.fillText("stubbed", x, mid);
  if (handle) {
    setFont(ctx, 400, size === 20 ? 15 : 13, TEXT, -0.2);
    ctx.fillStyle = p.secondary;
    ctx.textAlign = "right";
    ctx.fillText(`@${handle}`, W - x, mid);
    ctx.textAlign = "left";
  }
}

function fillAll(ctx: Ctx, color: string, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, h);
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
