import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Blocks";
import { storeConfigQuery } from "@/lib/queries";

export const Route = createFileRoute("/categories")({
  loader: ({ context }) => context.queryClient.ensureQueryData(storeConfigQuery),
  head: () => ({
    meta: [
      { title: "All categories — SabTk" },
      { name: "description", content: "Browse SabTk grocery categories: atta, rice, pulses, oil, spices, tea, dairy, snacks, fresh produce and household care." },
      { property: "og:title", content: "All categories — SabTk" },
      { property: "og:description", content: "Every SabTk grocery category in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { data } = useSuspenseQuery(storeConfigQuery);
  return (
    <>
      <PageHeader title="Categories" subtitle="Pick a category to start shopping." />
      <div className="container-page grid grid-cols-2 gap-3 py-8 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {data.categories.map((c) => (
          <Link
            key={c.id}
            to="/shop"
            search={{ category: c.slug }}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:shadow-card"
          >
            {c.image && (
              <img src={c.image} alt="" width={72} height={72} loading="lazy" className="size-16 rounded-xl object-cover md:size-20" />
            )}
            <span className="text-sm font-semibold leading-tight md:text-base">{c.name}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
