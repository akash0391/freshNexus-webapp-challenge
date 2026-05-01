import type { OFFNutriments } from "@/lib/types";

interface Row {
    label: string;
    value: number;
    unit: string;
}

function formatNumber(n: number, fractionDigits = 1): string {
    return n.toLocaleString(undefined, {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: 0,
    });
}

export function Nutriments({ nutriments }: { nutriments?: OFFNutriments }) {
    if (!nutriments) {
        return (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No nutrition information available.
            </p>
        );
    }

    const candidates: Array<{ label: string; value: number | undefined; unit: string }> = [
        { label: "Energy", value: nutriments["energy-kcal_100g"], unit: "kcal" },
        { label: "Fat", value: nutriments.fat_100g, unit: "g" },
        {
            label: "Saturated fat",
            value: nutriments["saturated-fat_100g"],
            unit: "g",
        },
        { label: "Sugars", value: nutriments.sugars_100g, unit: "g" },
        { label: "Salt", value: nutriments.salt_100g, unit: "g" },
        { label: "Proteins", value: nutriments.proteins_100g, unit: "g" },
    ];

    const rows: Row[] = candidates.flatMap((c) =>
        typeof c.value === "number" ? [{ label: c.label, value: c.value, unit: c.unit }] : [],
    );

    if (rows.length === 0) {
        return (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No nutrition information available.
            </p>
        );
    }

    return (
        <dl className="grid grid-cols-1 divide-y divide-black/5 rounded-md border border-black/10 sm:grid-cols-2 sm:divide-y-0 dark:divide-white/5 dark:border-white/10">
            {rows.map(({ label, value, unit }) => (
                <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 px-3 py-2 sm:border-b sm:border-black/5 sm:dark:border-white/5"
                >
                    <dt className="text-sm text-zinc-600 dark:text-zinc-400">{label}</dt>
                    <dd className="font-mono text-sm tabular-nums">
                        {formatNumber(value)} {unit}
                    </dd>
                </div>
            ))}
            <p className="col-span-full px-3 py-2 text-xs text-zinc-500">
                Values per 100 g.
            </p>
        </dl>
    );
}

export default Nutriments;
