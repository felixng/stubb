import { FAQS } from "@/components/landing/Faq";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// /llms.txt: a plain-text summary for AI assistants (llmstxt.org). Built
// from the landing page's own copy so the two say the same thing. Static,
// generated at build time.
export function GET() {
  const body = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Stubbed is a theatre diary app for theatre regulars, like a film diary but for live theatre. People log the shows they see (musicals, plays, opera, dance, comedy), rate them in half stars, add a note, group shows into trips, and share cards of a show or trip to Instagram. It covers any theatre, anywhere; shows and venues that aren't listed are added by users.",
    "",
    "Status: private beta. Sign-ups are not open yet; there is a waitlist on the home page.",
    "",
    "## Questions",
    "",
    ...FAQS.map((faq) => `- **${faq.question}** ${faq.answer}`),
    "",
    "## Links",
    "",
    `- [Home page and waitlist](${SITE_URL.href})`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
