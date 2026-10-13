"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Paths that aren't public traffic: the signed-in app, sign-in and onboarding.
const PRIVATE = /^\/(app|login|auth|welcome)(\/|$)/;

function publicOnly(event: BeforeSendEvent) {
  return PRIVATE.test(new URL(event.url).pathname) ? null : event;
}

// Vercel Web Analytics: page views, referrers and countries for the public
// pages (landing, legal pages, public profiles at /@handle). Cookieless, so no
// consent banner. Does nothing until Web Analytics is enabled on the Vercel
// project, and only sends from Vercel deployments.
export function SiteAnalytics() {
  return <Analytics beforeSend={publicOnly} />;
}
