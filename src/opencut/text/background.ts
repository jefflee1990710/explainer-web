export const CORNER_RADIUS_MIN = 0;
export const CORNER_RADIUS_MAX = 100;

export type TextBackgroundStyle =
	| "rounded"
	| "torn"
	| "brush"
	| "brutalist"
	| "skew"
	| "neon"
	| "gold";

export interface TextBackground {
	enabled: boolean;
	color: string;
	secondaryColor?: string;
	secondaryTextColor?: string;
	style?: TextBackgroundStyle;
	cornerRadius?: number;
	paddingX?: number;
	paddingY?: number;
	offsetX?: number;
	offsetY?: number;
}
