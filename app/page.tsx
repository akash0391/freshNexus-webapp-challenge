import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryFilter } from "@/components/CategoryFilter";
import { InfiniteProductList } from "@/components/InfiniteProductList";
import { SearchBar } from "@/components/SearchBar";
import { searchProducts } from "@/lib/openFoodFacts";

export const metadata: Metadata = {
  title: "Discover food products",
  description:
    "Search and browse food products from Open Food Facts by name or category.",
};

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = pickString(params.q);
  const category = pickString(params.category);

  const { products, count } = await searchProducts({ q, category });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Discover food products
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Powered by Open Food Facts. Search by name or filter by category.
        </p>
      </header>

      <Suspense fallback={null}>
        <SearchBar />
      </Suspense>
      <Suspense fallback={null}>
        <CategoryFilter />
      </Suspense>

      <p className="text-xs text-zinc-500">
        {count.toLocaleString()} products
        {q ? ` matching “${q}”` : ""}
        {category ? ` in ${category}` : ""}
      </p>

      <InfiniteProductList
        key={`${q ?? ""}::${category ?? ""}`}
        initialProducts={products}
        totalCount={count}
        q={q}
        category={category}
      />
    </div>
  );
}
