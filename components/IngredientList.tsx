export function IngredientList({ text }: { text?: string }) {
  const items = (text ?? "")
    .split(/[,;]/)
    .map((s) => s.replace(/^_+|_+$/g, "").trim())
    .filter(Boolean);

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Ingredient list not available.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((ingredient, i) => (
        <li
          key={`${ingredient}-${i}`}
          className="rounded-full bg-black/5 px-3 py-1 text-xs dark:bg-white/10"
        >
          {ingredient}
        </li>
      ))}
    </ul>
  );
}

export default IngredientList;
