"use client";

export type CreditOfferItem<T extends string> = {
  id: T;
  title: string;
  blurb?: string;
  price: string;
  priceHint?: string;
};

// Radio rows for a pack or plan group inside the credits dialog.
export function CreditOfferCards<T extends string>({
  legend,
  name,
  value,
  disabled,
  items,
  onChange,
}: {
  legend: string;
  name: string;
  value: T | null;
  disabled?: boolean;
  items: CreditOfferItem<T>[];
  onChange: (id: T) => void;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      {items.map((item) => (
        <label
          key={item.id}
          className={`flex cursor-pointer items-center gap-3 rounded-[1.25rem] border px-4 py-3 transition ${
            value === item.id
              ? "border-accent-ink bg-lime/40"
              : "border-accent-ink/15 bg-paper hover:border-accent-ink/30"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={item.id}
            checked={value === item.id}
            onChange={() => onChange(item.id)}
            className="h-4 w-4 accent-accent"
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold">{item.title}</span>
            {item.blurb ? (
              <span className="mt-0.5 block text-xs text-muted">{item.blurb}</span>
            ) : null}
          </span>
          <span className="font-display text-lg font-bold">
            {item.price}
            {item.priceHint ? (
              <span className="text-xs font-medium text-muted">{item.priceHint}</span>
            ) : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
