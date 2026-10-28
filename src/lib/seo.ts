/** Standard head() metadata for a SabTk page. */
export function pageHead(title: string, description: string, opts: { noindex?: boolean } = {}) {
  const full = `${title} — SabTk`;
  const meta: Record<string, string>[] = [
    { title: full },
    { name: "description", content: description },
    { property: "og:title", content: full },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ];
  if (opts.noindex) meta.push({ name: "robots", content: "noindex" });
  return { meta };
}
