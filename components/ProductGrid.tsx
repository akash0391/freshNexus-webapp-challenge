import type { OFFProduct } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: OFFProduct[] }) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
        No products found.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.code}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

export default ProductGrid;
