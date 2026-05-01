export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-64 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="h-10 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-20 animate-pulse rounded-full bg-black/10 dark:bg-white/10"
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
          >
            <div className="aspect-square animate-pulse bg-black/5 dark:bg-white/5" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading products…</span>
    </div>
  );
}
