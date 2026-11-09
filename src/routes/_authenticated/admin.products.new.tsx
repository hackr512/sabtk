import { pageHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { AdminTitle } from "@/components/admin/AdminBits";
import { emptyProduct, ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/_authenticated/admin/products/new")({
  head: () => pageHead("Add Product", "Add a grocery product to the SabTk catalogue.", { noindex: true }),
  component: () => (
    <>
      <AdminTitle title="Add product" subtitle="Publish it now or save it as a draft." />
      <ProductForm initial={emptyProduct} />
    </>
  ),
});
