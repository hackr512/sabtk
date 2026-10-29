import { createFileRoute } from "@tanstack/react-router";
import { AdminTitle } from "@/components/admin/AdminBits";
import { emptyProduct, ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/_authenticated/admin/products/new")({
  component: () => (
    <>
      <AdminTitle title="Add product" subtitle="Publish it now or save it as a draft." />
      <ProductForm initial={emptyProduct} />
    </>
  ),
});
