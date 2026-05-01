import type { Metadata } from "next";
import { getRates } from "@/lib/frankfurter";

export const metadata: Metadata = {
  title: "Market Insights",
  description:
    "Live foreign exchange rates from the European Central Bank via Frankfurter, plus context on FreshNexus.",
};

const CURRENCY_LABELS: Record<string, string> = {
  EUR: "Euro",
  GBP: "British Pound",
  INR: "Indian Rupee",
  JPY: "Japanese Yen",
};

function formatRate(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function InsightsPage() {
  const { base, date, rates } = await getRates();
  const entries = Object.entries(rates);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Market Insights
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Reference rates and a quick word on what FreshNexus is for.
        </p>
      </header>

      <section
        aria-labelledby="about-heading"
        className="flex flex-col gap-2"
      >
        <h2 id="about-heading" className="text-lg font-semibold">
          About FreshNexus
        </h2>
        <p className="max-w-prose text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          FreshNexus is a small reference app that surfaces nutrition,
          ingredients, and category metadata from the public{" "}
          <a
            href="https://world.openfoodfacts.org"
            className="underline hover:no-underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open Food Facts
          </a>{" "}
          database. Use the discover page to search by product or category, and
          drill into a barcode for full nutrition detail. Rates below are pulled
          from{" "}
          <a
            href="https://frankfurter.dev"
            className="underline hover:no-underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Frankfurter
          </a>
          , which republishes daily reference rates from the European Central
          Bank.
        </p>
      </section>

      <section
        aria-labelledby="rates-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="rates-heading" className="text-lg font-semibold">
          Foreign exchange rates
        </h2>
        <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Reference exchange rates from {base} to other currencies.
            </caption>
            <thead className="bg-black/5 dark:bg-white/5 text-left">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Currency
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Code
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Rate (per 1 {base})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {entries.map(([code, rate]) => (
                <tr key={code}>
                  <td className="px-4 py-2">
                    {CURRENCY_LABELS[code] ?? code}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {code}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatRate(rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">
          Last updated <time dateTime={date}>{formatDate(date)}</time>. Rates
          revalidate every 60 seconds.
        </p>
      </section>
    </div>
  );
}
