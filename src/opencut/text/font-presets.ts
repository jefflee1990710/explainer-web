export type TextFontPreset = {
	id: string;
	/** CSS family passed to Google Fonts and the timeline element. */
	family: string;
	/** Words shown on the card and written onto the new text clip. */
	sample: string;
	weights: number[];
	fontWeight?: "normal" | "bold";
};

/** Starter faces for the Text panel. System Arial stays first; the rest load from Google Fonts. */
export const TEXT_FONT_PRESETS: TextFontPreset[] = [
	{ id: "arial", family: "Arial", sample: "Default text", weights: [400, 700] },
	{ id: "inter", family: "Inter", sample: "Inter", weights: [400, 700] },
	{ id: "roboto", family: "Roboto", sample: "Roboto", weights: [400, 700] },
	{ id: "montserrat", family: "Montserrat", sample: "Montserrat", weights: [400, 700], fontWeight: "bold" },
	{ id: "poppins", family: "Poppins", sample: "Poppins", weights: [400, 700] },
	{ id: "oswald", family: "Oswald", sample: "Oswald", weights: [400, 700], fontWeight: "bold" },
	{ id: "bebas", family: "Bebas Neue", sample: "Bebas", weights: [400] },
	{ id: "anton", family: "Anton", sample: "Anton", weights: [400] },
	{ id: "playfair", family: "Playfair Display", sample: "Playfair", weights: [400, 700] },
	{ id: "lora", family: "Lora", sample: "Lora", weights: [400, 700] },
	{ id: "pacifico", family: "Pacifico", sample: "Pacifico", weights: [400] },
	{ id: "caveat", family: "Caveat", sample: "Caveat", weights: [400, 700] },
	{ id: "source-code", family: "Source Code Pro", sample: "Code", weights: [400, 700] },
	{ id: "noto-sans-tc", family: "Noto Sans TC", sample: "繁體標題", weights: [400, 700] },
	{ id: "noto-serif-tc", family: "Noto Serif TC", sample: "繁體內文", weights: [400, 700] },
];
