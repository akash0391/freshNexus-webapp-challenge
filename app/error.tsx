"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h2 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
        We couldn&apos;t load this page. Open Food Facts may be temporarily
        unavailable, or the request was rate-limited.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-zinc-500">ref: {error.digest}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={unstable_retry}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
