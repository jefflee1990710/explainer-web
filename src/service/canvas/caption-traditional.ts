// Scribe returns Simplified glyphs. Cantonese captions are stored in Hong Kong Traditional.
import { Converter } from "opencc-js";

const toHongKong = Converter({ from: "cn", to: "hk" });

export function hongKongTraditional(text: string): string {
  return text ? toHongKong(text) : text;
}

// Only `yue` changes script. Mandarin, English, and auto keep Scribe's wording.
export function applyCaptionScript(text: string, language: string): string {
  return language === "yue" ? hongKongTraditional(text) : text;
}
