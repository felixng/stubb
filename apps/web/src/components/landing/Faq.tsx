// Questions people ask before signing up. The same list feeds the FAQPage
// structured data on /faq, so the two can't drift. Answers must
// stay true to the private beta: no open sign-up, no prices, no dates.
export const FAQS = [
  {
    question: "Can I sign up for Stubbed now?",
    answer:
      "Not yet. Stubbed is in private beta and isn’t open for sign-ups. Join the waitlist with your email and we’ll send you one email when it opens. No newsletter, and you can unsubscribe any time.",
  },
  {
    question: "How much does Stubbed cost?",
    answer:
      "Nothing during the private beta. Logging your shows and getting your own data out will always be free.",
  },
  {
    question: "Which theatres and shows does it cover?",
    answer:
      "Any theatre, anywhere, from the biggest houses to fringe venues and village halls. You can log musicals, plays, opera, dance, comedy and anything else on a stage. If a show or venue isn’t listed yet, you add it in a few seconds while you log.",
  },
  {
    question: "Is there an iPhone app?",
    answer:
      "Stubbed works in your phone’s browser today and is designed for logging one-handed on the way out of the theatre. A native iPhone app is planned.",
  },
  {
    question: "Can I add shows I saw before joining?",
    answer:
      "Yes. Paste or upload your ticket confirmation emails, or add photos from past nights out, and Stubbed reads the show, venue and date and suggests entries. Nothing is saved until you have checked it.",
  },
  {
    question: "Are my entries public?",
    answer:
      "Entries start public so they are easy to share, and you can make any entry private with one tap. Photos have their location data removed before they are uploaded.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Your diary is yours. You’ll be able to download all of it as a CSV file at any time.",
  },
];

export function Faq() {
  return (
    <div className="flex flex-col gap-6">
      {FAQS.map((faq) => (
        <div key={faq.question} className="flex flex-col gap-1">
          <h2 className="text-headline text-label">{faq.question}</h2>
          <p className="text-body text-label-secondary">{faq.answer}</p>
        </div>
      ))}
    </div>
  );
}
