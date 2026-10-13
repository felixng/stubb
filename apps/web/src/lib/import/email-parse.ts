// Turning exported confirmation emails into plain text, on the device (#17).
//
// Handles what mail apps export: .eml (Gmail "Download message", Apple Mail,
// Outlook "Save as"), .mbox (Google Takeout, Apple Mail export), saved .html
// pages and plain text or pasted text. MIME is decoded here (multipart,
// base64, quoted-printable, RFC 2047 headers, forwarded messages) so only the
// readable text is sent for extraction, never attachments.
//
// No DOM or Node APIs beyond TextDecoder, so the same code runs in the
// browser, on the server and in unit tests.

export type ParsedEmail = {
  // Stable within one import session, e.g. "tickets.mbox#3".
  ref: string;
  fileName: string;
  subject: string | null;
  from: string | null;
  // When the email was sent, "2026-10-02". Lets extraction work out the
  // year of a performance written as "Sat 10 Oct".
  sent: string | null;
  text: string;
  // True when the text was cut to MAX_EMAIL_CHARS (shown on the review screen).
  trimmed: boolean;
};

// Confirmation emails put the booking near the top; this is plenty, and it
// caps what one extraction call costs.
export const MAX_EMAIL_CHARS = 30_000;

export const EMAIL_FILE_ACCEPT = ".eml,.mbox,.txt,.html,.htm,.mht,message/rfc822,text/plain,text/html";

type Headers = Map<string, string>;

const lc = (s: string) => s.toLowerCase();

// Splits a MIME entity into unfolded headers and body.
function splitEntity(raw: string): { headers: Headers; body: string } {
  const text = raw.replace(/\r\n?/g, "\n");
  // A MIME part may have no headers at all: it starts with the blank line.
  if (text.startsWith("\n")) return { headers: new Map(), body: text.slice(1) };
  const end = text.search(/\n\n/);
  const head = end === -1 ? text : text.slice(0, end);
  const body = end === -1 ? "" : text.slice(end + 2);
  const headers: Headers = new Map();
  let last: string | null = null;
  for (const line of head.split("\n")) {
    if (/^[ \t]/.test(line) && last) {
      headers.set(last, `${headers.get(last)} ${line.trim()}`);
      continue;
    }
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    last = lc(line.slice(0, colon).trim());
    // Keep the first occurrence (the outermost Subject/From/Date).
    if (!headers.has(last)) headers.set(last, line.slice(colon + 1).trim());
  }
  return { headers, body };
}

// "text/html; charset=UTF-8; boundary=x" → { value: "text/html", params }
function parseHeaderValue(value: string | undefined) {
  const [first, ...rest] = (value ?? "").split(";");
  const params = new Map<string, string>();
  for (const p of rest) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    params.set(lc(p.slice(0, eq).trim()), p.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1"));
  }
  return { value: lc(first.trim()), params };
}

// A JS string holding raw bytes (one char per byte, or already-decoded text
// from File.text()) → bytes. Characters above 0xFF are UTF-8 encoded, so
// text that was already decoded survives the round trip.
function toBytes(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code < 0x100) out.push(code);
    else out.push(...new TextEncoder().encode(ch));
  }
  return Uint8Array.from(out);
}

function decodeBytes(bytes: Uint8Array, charset: string | undefined) {
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/=_-]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  try {
    const bin = atob(clean);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
}

function quotedPrintableToBytes(s: string, header = false): Uint8Array {
  const src = (header ? s.replace(/_/g, " ") : s).replace(/=\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const hex = src[i] === "=" ? src.slice(i + 1, i + 3) : "";
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...toBytes(src[i]));
    }
  }
  return Uint8Array.from(bytes);
}

// RFC 2047: "=?UTF-8?Q?Your_tickets_for_Hadestown?=" → "Your tickets for Hadestown"
export function decodeHeader(value: string | undefined): string | null {
  if (!value) return null;
  const out = value
    .replace(/\?=\s+=\?/g, "?==?") // adjacent encoded words join without the space
    .replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_, charset: string, enc: string, data: string) =>
      decodeBytes(lc(enc) === "b" ? base64ToBytes(data) : quotedPrintableToBytes(data, true), charset.split("*")[0]),
    )
    .trim();
  return out || null;
}

function decodeBody(body: string, headers: Headers) {
  const encoding = lc(headers.get("content-transfer-encoding") ?? "");
  const { params } = parseHeaderValue(headers.get("content-type"));
  const charset = params.get("charset");
  if (encoding === "base64") return decodeBytes(base64ToBytes(body), charset);
  if (encoding === "quoted-printable") return decodeBytes(quotedPrintableToBytes(body), charset);
  // 7bit/8bit: File.text() already decoded it as UTF-8. Re-decode only for
  // a declared single-byte charset, where the bytes map one to one.
  if (charset && !/^(utf-?8|us-ascii)$/i.test(charset) && !/[^\u0000-ÿ]/.test(body)) {
    return decodeBytes(toBytes(body), charset);
  }
  return body;
}

type Parts = { plain: string[]; html: string[]; calendar: string[] };

function collectParts(raw: string, parts: Parts, depth = 0) {
  if (depth > 8) return;
  const { headers, body } = splitEntity(raw);
  const type = parseHeaderValue(headers.get("content-type") ?? "text/plain");
  const disposition = parseHeaderValue(headers.get("content-disposition")).value;

  if (type.value.startsWith("multipart/")) {
    const boundary = type.params.get("boundary");
    if (!boundary) return;
    const marker = `--${boundary}`;
    const chunks = body.replace(/\r\n?/g, "\n").split(`\n${marker}`);
    // The first chunk is the preamble, unless the body starts on the marker.
    const first = chunks[0].startsWith(marker) ? [chunks[0].slice(marker.length)] : [];
    for (const chunk of [...first, ...chunks.slice(1)]) {
      if (chunk.startsWith("--")) break; // closing marker
      collectParts(chunk.replace(/^[^\n]*\n/, ""), parts, depth + 1);
    }
    return;
  }
  // A forwarded email attached whole: its text is what matters.
  if (type.value === "message/rfc822") {
    collectParts(decodeBody(body, headers), parts, depth + 1);
    return;
  }
  // Tickets often arrive as an .ics invite; its text is short and useful.
  if (type.value === "text/calendar") {
    parts.calendar.push(decodeBody(body, headers));
    return;
  }
  if (disposition === "attachment") return;
  if (type.value === "text/html") parts.html.push(decodeBody(body, headers));
  else if (type.value === "text/plain") parts.plain.push(decodeBody(body, headers));
}

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", pound: "£", euro: "€",
  copy: "©", reg: "®", trade: "™", bull: "•", middot: "·", times: "×", eacute: "é",
  egrave: "è", agrave: "à", ccedil: "ç", uuml: "ü", ouml: "ö", auml: "ä", zwnj: "", zwj: "", shy: "",
};

// Good-enough HTML → text for email bodies: keeps line structure and image
// alt text (some senders put the show title only in an image), drops markup.
export function htmlToText(html: string): string {
  return tidy(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<img\b[^>]*\balt\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi, (_, __, a, b) => ` ${a ?? b ?? ""} `)
      .replace(/<br\b[^>]*>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6]|table|section|header|footer|blockquote)>/gi, "\n")
      .replace(/<\/(td|th)>/gi, "  ")
      .replace(/<[^>]+>/g, "")
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, name: string) => {
        if (name[0] === "#") {
          const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
          return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
        }
        return ENTITIES[lc(name)] ?? m;
      }),
  );
}

function tidy(text: string) {
  return text
    .replace(/[​-‍⁠﻿­͏]/g, "") // preheader padding
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value.replace(/\s*\([^)]*\)\s*$/, ""));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const looksLikeHtml = (s: string) => /<(html|body|table|div|p|br)\b/i.test(s);

// A message with headers (.eml or one message from an .mbox).
export function parseEml(raw: string, fileName: string, ref = fileName): ParsedEmail {
  const { headers } = splitEntity(raw);
  const parts: Parts = { plain: [], html: [], calendar: [] };
  collectParts(raw, parts);
  // HTML is usually the complete version; plain parts of marketing-style
  // emails are often a stub. Fall back to plain when there's no HTML.
  const body = parts.html.length
    ? parts.html.map(htmlToText).join("\n\n")
    : parts.plain.map((p) => (looksLikeHtml(p) ? htmlToText(p) : tidy(p))).join("\n\n");
  const calendar = parts.calendar.map((c) => tidy(c)).join("\n\n");
  return finish({
    ref,
    fileName,
    subject: decodeHeader(headers.get("subject")),
    from: decodeHeader(headers.get("from")),
    sent: toIsoDate(headers.get("date")),
    text: calendar ? `${body}\n\nCalendar invite:\n${calendar}` : body,
  });
}

function finish(email: Omit<ParsedEmail, "trimmed">): ParsedEmail {
  const trimmed = email.text.length > MAX_EMAIL_CHARS;
  return { ...email, text: trimmed ? email.text.slice(0, MAX_EMAIL_CHARS) : email.text, trimmed };
}

// .mbox: messages separated by "From " lines; body lines starting "From "
// were escaped as ">From ".
export function splitMbox(raw: string): string[] {
  return raw
    .replace(/\r\n?/g, "\n")
    .split(/(?:^|\n)From [^\n]*\n/)
    .map((m) => m.replace(/^>(>*From )/gm, "$1"))
    .filter((m) => m.trim());
}

const HEADER_START = /^(return-path|received|delivered-to|from|to|subject|date|mime-version|message-id|x-[\w-]+|dkim-signature|arc-[\w-]+):/i;

// Any supported file (or pasted text) → its emails. Unknown extensions are
// sniffed: headers first means a message, tags mean HTML, else plain text.
export function parseEmailFile(fileName: string, raw: string): ParsedEmail[] {
  const ext = lc(fileName.split(".").pop() ?? "");
  const start = raw.trimStart();
  if (ext === "mbox" || /^From \S+.*\n[\w-]+:/.test(start.slice(0, 500))) {
    return splitMbox(raw).map((m, i) => parseEml(m, fileName, `${fileName}#${i + 1}`));
  }
  if (ext === "eml" || ext === "mht" || HEADER_START.test(start)) return [parseEml(start, fileName)];
  const text = looksLikeHtml(raw) || ext === "html" || ext === "htm" ? htmlToText(raw) : tidy(raw);
  const title = /<title>([^<]*)<\/title>/i.exec(raw)?.[1]?.trim();
  return [finish({ ref: fileName, fileName, subject: title || null, from: null, sent: null, text })];
}
