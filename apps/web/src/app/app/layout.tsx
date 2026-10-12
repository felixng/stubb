import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { AccountMenu } from "@/components/app/AccountMenu";
import { AppTabBar, AppTabBarLinks } from "@/components/app/AppTabBar";
import { Wordmark } from "@/components/ui/Wordmark";

// Owner-only app shell (#13), mobile first. The proxy sends signed-out visits
// to /login; data access is still guarded by RLS. The shell itself doesn't
// read the session, so it prerenders and opens instantly.
export const metadata: Metadata = {
  title: { default: "Stubbed", template: "%s — Stubbed" },
  robots: { index: false, follow: false },
};

// Lets the tab bar sit above the home indicator on iPhones.
export const viewport: Viewport = { viewportFit: "cover" };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-separator bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[640px] items-center justify-between px-4">
          <Wordmark size={18} />
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-5">{children}</main>
      <div className="sticky bottom-0 z-20">
        <div className="mx-auto max-w-[640px]">
          <Suspense fallback={<AppTabBarLinks pathname="" />}>
            <AppTabBar />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
