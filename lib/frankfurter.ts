const BASE_URL = "https://api.frankfurter.dev/v1";
const REVALIDATE_SECONDS = 60;

const DEFAULT_SYMBOLS = ["EUR", "GBP", "INR", "JPY"] as const;

export interface RatesResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface GetRatesOptions {
  base?: string;
  symbols?: readonly string[];
}

export async function getRates({
  base = "USD",
  symbols = DEFAULT_SYMBOLS,
}: GetRatesOptions = {}): Promise<RatesResponse> {
  const params = new URLSearchParams({
    base,
    symbols: symbols.join(","),
  });

  const res = await fetch(`${BASE_URL}/latest?${params.toString()}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(
      `Frankfurter rates fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as RatesResponse & { amount?: number };
  return {
    base: data.base,
    date: data.date,
    rates: data.rates,
  };
}
