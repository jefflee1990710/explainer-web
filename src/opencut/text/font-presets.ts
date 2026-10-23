export type TextFontPreset = {
	id: string;
	/** Display label shown in subtitle/font pickers. */
	label?: string;
	/** CSS family (or bilingual Google Font stack) passed to Google Fonts and the timeline element. */
	family: string;
	/** Words shown on the card and written onto the new text clip. */
	sample: string;
	weights: number[];
	fontWeight?: "normal" | "bold";
};

/**
 * Curated bilingual (English + Traditional Chinese / Cantonese) Google Font pairings
 * and starter faces for the Text & Subtitle panels.
 */
export const TEXT_FONT_PRESETS: TextFontPreset[] = [
	{
		id: "pop-heavy",
		label: "綜藝爆款 · Pop Heavy",
		family: "Anton, Dela Gothic One, Noto Sans TC",
		sample: "爆款 Hook 100%",
		weights: [400, 700, 900],
		fontWeight: "bold",
	},
	{
		id: "modern-sans",
		label: "現代粗黑 · Modern Sans",
		family: "Montserrat, Noto Sans TC",
		sample: "重點解說 Key Point",
		weights: [400, 700, 900],
		fontWeight: "bold",
	},
	{
		id: "bubble-pop",
		label: "可愛泡泡 · Bubble Pop",
		family: "Fredoka, Mochiy Pop One, Zen Maru Gothic, Noto Sans TC",
		sample: "超正 Daily Vlog",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{
		id: "zen-maru",
		label: "日系圓體 · Zen Maru",
		family: "Poppins, Zen Maru Gothic, Noto Sans TC",
		sample: "輕鬆分享 Chill",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{
		id: "wenkai-hand",
		label: "手寫文楷 · WenKai Note",
		family: "Caveat, LXGW WenKai TC, Noto Sans TC",
		sample: "手寫溫度 Story",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{
		id: "marker-scribble",
		label: "塗鴉手寫 · Marker",
		family: "Permanent Marker, Yomogi, LXGW WenKai TC, Noto Sans TC",
		sample: "白板塗鴉 Idea!",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{
		id: "cinema-serif",
		label: "港風明體 · Cinema Serif",
		family: "Playfair Display, Noto Serif TC",
		sample: "電影對白 Classic",
		weights: [400, 700, 900],
		fontWeight: "bold",
	},
	{
		id: "street-rock",
		label: "街頭勁道 · Street Rock",
		family: "Bebas Neue, RocknRoll One, Noto Sans TC",
		sample: "街頭態度 Vibe",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{
		id: "manga-impact",
		label: "熱血漫畫 · Manga Impact",
		family: "Oswald, Reggae One, Noto Sans TC",
		sample: "真相揭秘 Truth!",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{
		id: "rampart-3d",
		label: "立體空心 · 3D Outline",
		family: "Anton, Rampart One, Dela Gothic One, Noto Sans TC",
		sample: "立體標題 3D",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{
		id: "pixel-tech",
		label: "數碼像素 · Pixel Tech",
		family: "Chakra Petch, DotGothic16, Noto Sans TC",
		sample: "AI 科技 2026",
		weights: [400, 700],
		fontWeight: "bold",
	},
	{ id: "noto-sans-tc", label: "思源黑體 · Noto Sans TC", family: "Noto Sans TC", sample: "繁體標題", weights: [400, 700, 900], fontWeight: "bold" },
	{ id: "noto-serif-tc", label: "思源宋體 · Noto Serif TC", family: "Noto Serif TC", sample: "繁體內文", weights: [400, 700, 900] },
	{ id: "arial", label: "Arial", family: "Arial", sample: "Default text", weights: [400, 700] },
	{ id: "inter", label: "Inter", family: "Inter", sample: "Inter", weights: [400, 700] },
	{ id: "roboto", label: "Roboto", family: "Roboto", sample: "Roboto", weights: [400, 700] },
	{ id: "montserrat", label: "Montserrat", family: "Montserrat", sample: "Montserrat", weights: [400, 700], fontWeight: "bold" },
	{ id: "poppins", label: "Poppins", family: "Poppins", sample: "Poppins", weights: [400, 700] },
	{ id: "oswald", label: "Oswald", family: "Oswald", sample: "Oswald", weights: [400, 700], fontWeight: "bold" },
	{ id: "bebas", label: "Bebas Neue", family: "Bebas Neue", sample: "Bebas", weights: [400] },
	{ id: "anton", label: "Anton", family: "Anton", sample: "Anton", weights: [400] },
	{ id: "playfair", label: "Playfair Display", family: "Playfair Display", sample: "Playfair", weights: [400, 700] },
	{ id: "lora", label: "Lora", family: "Lora", sample: "Lora", weights: [400, 700] },
	{ id: "pacifico", label: "Pacifico", family: "Pacifico", sample: "Pacifico", weights: [400] },
	{ id: "caveat", label: "Caveat", family: "Caveat", sample: "Caveat", weights: [400, 700] },
	{ id: "source-code", label: "Source Code Pro", family: "Source Code Pro", sample: "Code", weights: [400, 700] },
];
