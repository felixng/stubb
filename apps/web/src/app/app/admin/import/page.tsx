import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminOnly } from "@/components/app/admin/AdminOnly";
import { ImportTool } from "@/components/app/import/ImportTool";

export const metadata: Metadata = { title: "Import: compare models" };

// The import tool with the model picker and side-by-side comparison (#17,
// #18), for admins only. /app/import is the same tool as everyone gets it.
export default function AdminImportPage() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link href="/app/admin" className="text-subheadline font-semibold text-tint-text underline-offset-2 hover:underline">
          Admin
        </Link>
        <h1 className="text-large-title font-display text-label">Import: compare models</h1>
        <p className="text-subheadline text-label-secondary">
          Read past shows from ticket emails or theatre photos with the models you pick. You check every one before it’s saved.
        </p>
      </div>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <AdminOnly>
          <ImportTool admin />
        </AdminOnly>
      </Suspense>
    </section>
  );
}
