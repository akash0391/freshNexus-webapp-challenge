"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORIES = [
  { slug: "snacks", label: "Snacks" },
  { slug: "beverages", label: "Beverages" },
  { slug: "dairy", label: "Dairy" },
  { slug: "cereals", label: "Cereals" },
  { slug: "breads", label: "Breads" },
] as const;

function buildHref(
  current: URLSearchParams,
  categorySlug: string | null,
): string {
  const params = new URLSearchParams(current.toString());
  if (categorySlug) {
    params.set("category", categorySlug);
  } else {
    params.delete("category");
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function CategoryFilter() {
  const searchParams = useSearchParams();
  const active = searchParams.get("category");

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      <Link
        href={buildHref(searchParams, null)}
        className={`rounded-full border px-3 py-1 text-xs transition ${
          active === null
            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
            : "border-black/15 hover:border-black/40 dark:border-white/15 dark:hover:border-white/40"
        }`}
      >
        All
      </Link>
      {CATEGORIES.map(({ slug, label }) => {
        const isActive = active === slug;
        return (
          <Link
            key={slug}
            href={buildHref(searchParams, slug)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              isActive
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/15 hover:border-black/40 dark:border-white/15 dark:hover:border-white/40"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default CategoryFilter;
