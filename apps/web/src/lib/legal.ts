// Details the Terms and Privacy Policy depend on, kept in one place so the
// two pages can't disagree. Bump `updated` whenever either page changes in
// substance, and tell users about material changes (see both pages).
//
// TODO(owner): fill in the bracketed values before these pages go live. UK
// and EU law require the controller's identity and a working contact address.
export const LEGAL = {
  // The person or company legally responsible for Stubbed (the "controller").
  operator: "[Operator legal name]",
  // A postal address for legal notices. UK GDPR / GDPR Art. 13(1)(a).
  address: "[Postal address]",
  // Monitored inbox for privacy requests, legal notices and content reports.
  email: "[privacy@your-domain]",
  // Where the operator is based; decides the Terms' governing law.
  governingLaw: "England and Wales",
  courts: "the courts of England and Wales",
  // Shown as "Last updated" on both pages.
  updated: "13 October 2026",
  // Everyone must be at least this old to use Stubbed.
  minimumAge: 16,
} as const;
