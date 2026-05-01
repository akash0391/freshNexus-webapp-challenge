import type { NutriScoreGrade } from "./types";

export const NUTRISCORE_STYLES: Record<NutriScoreGrade, string> = {
  a: "bg-green-600 text-white",
  b: "bg-lime-600 text-white",
  c: "bg-yellow-400 text-black",
  d: "bg-orange-500 text-white",
  e: "bg-red-600 text-white",
  unknown: "bg-zinc-300 text-black",
};

export function nutriScoreLabel(
  grade: NutriScoreGrade | undefined,
): { grade: NutriScoreGrade; label: string } {
  const resolved: NutriScoreGrade = grade ?? "unknown";
  return {
    grade: resolved,
    label: resolved === "unknown" ? "?" : resolved.toUpperCase(),
  };
}
