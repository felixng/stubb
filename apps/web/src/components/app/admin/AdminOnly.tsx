import { notFound } from "next/navigation";

import { currentUser } from "@/lib/supabase/require-user";

// Renders its children only for an admin (see lib/admin); a 404 for anyone
// else. The proxy already turns non-admins away from /app/admin with a 404;
// this is the check that doesn't depend on it. Wrap it in <Suspense>: it
// reads the session.
//
// Admin pages are marked so they're never mistaken for the real app: an
// "Admin only" pill, and a faint tiled watermark over the whole page that
// doesn't catch taps or clicks. Both render only after the check passes.
export async function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user?.admin) notFound();
  return (
    <>
      <AdminWatermark />
      <p className="self-start rounded-pill bg-tint-fill px-3 py-1 text-footnote font-semibold tracking-wide text-tint-text uppercase">
        Admin only
      </p>
      {children}
    </>
  );
}

const ROWS = 14;
const PER_ROW = 6;

// Above the page content but under the header and tab bar (z-20), so it
// shows over cards too; pointer-events-none keeps everything usable.
function AdminWatermark() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none">
      <div className="absolute top-1/2 left-1/2 flex w-[250vmax] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] flex-col gap-16">
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} className={`flex justify-center gap-16 whitespace-nowrap ${r % 2 ? "translate-x-24" : ""}`}>
            {Array.from({ length: PER_ROW * 2 }, (_, i) => (
              <span key={i} className="font-display text-title font-extrabold tracking-[0.2em] text-tint-text opacity-[0.07]">
                ADMIN
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
