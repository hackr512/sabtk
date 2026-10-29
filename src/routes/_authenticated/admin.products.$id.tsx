import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminTitle, Empty } from "@/components/admin/AdminBits";
import { ProductForm, toFormValues } from "@/components/admin/ProductForm";
import { adminGetProduct } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const fn = useServerFn(adminGetProduct);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "product", id], queryFn: () => fn({ data: { id } }) });
  if (isLoading) return <Empty>Loading…</Empty>;
  if (!data) return <Empty>Product not found.</Empty>;
  return (
    <>
      <AdminTitle title={`Edit: ${data.name}`} subtitle={data.archived ? "This product is archived. Saving restores it." : undefined} />
      <ProductForm initial={toFormValues(data)} />
    </>
  );
}
