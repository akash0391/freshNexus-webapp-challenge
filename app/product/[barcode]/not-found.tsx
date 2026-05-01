import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h2 className="text-2xl font-semibold tracking-tight">
        Product not found
      </h2>
      <p className="max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
        We couldn&apos;t find a product with that barcode in Open Food Facts.
        Try searching for a different one.
      </p>
      <Link
        href="/"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Back to discover
      </Link>
    </div>
  );
}
