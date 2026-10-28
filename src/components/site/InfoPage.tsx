import type { ReactNode } from "react";
import { PageHeader } from "./Blocks";

export function InfoPage({ title, subtitle, eyebrow, children }: { title: string; subtitle?: string; eyebrow?: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} />
      <div className="container-page max-w-3xl space-y-8 py-10 text-[15px] leading-relaxed text-foreground/90 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
