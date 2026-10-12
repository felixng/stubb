import type { Metadata } from "next";

import { LogForm } from "@/components/app/log/LogForm";

export const metadata: Metadata = { title: "Log a show" };

export default function LogPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-large-title font-display text-label">Log a show</h1>
      <LogForm />
    </section>
  );
}
