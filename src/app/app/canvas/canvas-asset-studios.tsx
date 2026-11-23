"use client";

import Link from "next/link";

// Character, fitting room, wardrobe, and products now open from the canvas Assets tab.
export function CanvasAssetStudios({ isZh }: { isZh: boolean }) {
  const links = [
    { href: "/app/characters", zh: "角色", en: "Characters" },
    { href: "/app/room", zh: "試衣間", en: "Fitting room" },
    { href: "/app/wardrobe", zh: "衣櫥", en: "Wardrobe" },
    { href: "/app/products", zh: "產品", en: "Products" },
  ];

  return (
    <div className="mb-3 grid grid-cols-2 gap-1.5">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-[10px] border border-white/10 bg-white/5 px-2 py-2 text-center text-[11px] font-semibold text-white/85 transition hover:border-[#c6f24b]/50 hover:text-white"
        >
          {isZh ? link.zh : link.en}
        </Link>
      ))}
    </div>
  );
}
