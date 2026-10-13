import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { decodeHeader, htmlToText, MAX_EMAIL_CHARS, parseEmailFile } from "@/lib/import/email-parse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/emails/${name}`, import.meta.url), "utf8");

test("decodes a multipart confirmation: base64 HTML wins over a stub plain part", () => {
  const [email] = parseEmailFile("confirmation.eml", fixture("confirmation.eml"));
  assert.equal(email.subject, "Your tickets for Hadestown – order confirmed");
  assert.equal(email.from, '"Example Box Office" <tickets@boxoffice.example>');
  assert.equal(email.sent, "2026-10-02");
  assert.match(email.text, /Hadestown/); // from the image alt text
  assert.match(email.text, /Walter Kerr Theatre/);
  assert.match(email.text, /Saturday, October 10, 2026 at 7:00 PM/);
  assert.match(email.text, /Orchestra M 104 & 105/);
  assert.match(email.text, /we’re here/);
  assert.doesNotMatch(email.text, /color:red|<td>|&nbsp;|‌|view this email/i);
  assert.equal(email.trimmed, false);
});

test("reads a forwarded message and skips attachments", () => {
  const [email] = parseEmailFile("forwarded.eml", fixture("forwarded.eml"));
  assert.equal(email.subject, "Fwd: Booking confirmed");
  assert.equal(email.sent, "2026-10-05");
  assert.match(email.text, /See below\./);
  // iso-8859-1 quoted-printable: =96 is an en dash in windows-1252, =A3 is £.
  assert.match(email.text, /Operation Mincemeat . Fortune Theatre, London/);
  assert.match(email.text, /£65\.00/);
  assert.doesNotMatch(email.text, /JVBERi/);
});

test("splits an mbox into messages and unescapes >From lines", () => {
  const emails = parseEmailFile("two.mbox", fixture("two.mbox"));
  assert.equal(emails.length, 2);
  assert.deepEqual(
    emails.map((e) => [e.ref, e.subject, e.sent]),
    [
      ["two.mbox#1", "First booking", "2026-10-01"],
      ["two.mbox#2", "Second booking", "2026-10-02"],
    ],
  );
  assert.match(emails[0].text, /^Show: Hamilton\nFrom the box office/);
  assert.equal(emails[1].text, "Show: Wicked");
});

test("pasted or unknown text: sniffs headers, HTML or plain", () => {
  const [plain] = parseEmailFile("Pasted email 1", "  Your order\n\n\n\nHamilton  at the   Richard Rodgers ");
  assert.equal(plain.text, "Your order\n\nHamilton at the Richard Rodgers");
  assert.equal(plain.subject, null);

  const [html] = parseEmailFile("page.html", "<html><title>Order 42</title><body><p>Les Mis&eacute;rables</p></body></html>");
  assert.equal(html.subject, "Order 42");
  assert.equal(html.text, "Les Misérables");

  const [eml] = parseEmailFile("Pasted email 2", "Subject: Hi\nFrom: a@b.example\n\nBody text");
  assert.equal(eml.subject, "Hi");
  assert.equal(eml.text, "Body text");
});

test("trims very long emails and says so", () => {
  const [email] = parseEmailFile("long.txt", "x".repeat(MAX_EMAIL_CHARS + 10));
  assert.equal(email.text.length, MAX_EMAIL_CHARS);
  assert.equal(email.trimmed, true);
});

test("decodeHeader joins adjacent encoded words", () => {
  assert.equal(decodeHeader("=?UTF-8?B?Qm9vaw==?= =?UTF-8?Q?ing_=C3=A9?="), "Booking é");
  assert.equal(decodeHeader("Plain subject"), "Plain subject");
  assert.equal(decodeHeader(undefined), null);
});

test("htmlToText keeps rows on separate lines and decodes entities", () => {
  assert.equal(htmlToText("<tr><td>A</td><td>B</td></tr><tr><td>&#8364;5 &#x2014; ok</td></tr>"), "A B\n€5 — ok");
});
