"use client";

import { ExampleBand } from "@/presentation/components/example-band";
import { EXAMPLE_ITEMS } from "@/presentation/components/example-catalog";
import { ExamplesHero } from "@/presentation/components/examples-hero";

// Each explainer type gets its own band, alternating which side holds the copy.
export function ExamplesView() {
  return (
    <main>
      <ExamplesHero />
      {EXAMPLE_ITEMS.map((item, index) => (
        <ExampleBand key={item.id} item={item} flip={index % 2 === 1} />
      ))}
    </main>
  );
}
