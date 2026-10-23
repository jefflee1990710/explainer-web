"use client";

import type {
	ParamDefinition,
	NumberParamDefinition,
	ParamValue,
} from "@/opencut/params";
import {
	formatNumberForDisplay,
	getFractionDigitsForStep,
	snapToStep,
} from "@/opencut/utils/math";
import { SectionField } from "@/opencut/components/section";
import { NumberField } from "@/opencut/components/ui/number-field";
import { Switch } from "@/opencut/components/ui/switch";
import { ColorPicker } from "@/opencut/components/ui/color-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/opencut/components/ui/select";
import { usePropertyDraft } from "../hooks/use-property-draft";
import { KeyframeToggle } from "./keyframe-toggle";
import { Textarea } from "@/opencut/components/ui/textarea";
import { loadFullFont } from "@/opencut/fonts/google-fonts";
import { TEXT_FONT_PRESETS } from "@/opencut/text/font-presets";

export function PropertyParamField({
	param,
	value,
	onPreview,
	onCommit,
	keyframe,
}: {
	param: ParamDefinition;
	value: ParamValue;
	onPreview: (value: ParamValue) => void;
	onCommit: () => void;
	keyframe?: {
		isActive: boolean;
		isDisabled: boolean;
		onToggle: () => void;
	};
}) {
	return (
		<SectionField
			label={param.label}
			beforeLabel={
				keyframe && param.keyframable !== false ? (
					<KeyframeToggle
						isActive={keyframe.isActive}
						isDisabled={keyframe.isDisabled}
						title={`Toggle ${param.label.toLowerCase()} keyframe`}
						onToggle={keyframe.onToggle}
					/>
				) : undefined
			}
		>
			<ParamInput
				param={param}
				value={value}
				onPreview={onPreview}
				onCommit={onCommit}
			/>
		</SectionField>
	);
}

function ParamInput({
	param,
	value,
	onPreview,
	onCommit,
}: {
	param: ParamDefinition;
	value: ParamValue;
	onPreview: (value: ParamValue) => void;
	onCommit: () => void;
}) {
	if (param.type === "number") {
		return (
			<NumberParamField
				param={param}
				value={typeof value === "number" ? value : Number(value)}
				onPreview={onPreview}
				onCommit={onCommit}
			/>
		);
	}

	if (param.type === "boolean") {
		return (
			<Switch
				checked={Boolean(value)}
				onCheckedChange={(checked) => {
					onPreview(checked);
					onCommit();
				}}
			/>
		);
	}

	if (param.type === "select") {
		return (
			<Select
				value={String(value)}
				onValueChange={(selected) => {
					onPreview(selected);
					onCommit();
				}}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{param.options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	if (param.type === "color") {
		return (
			<ColorPicker
				value={String(value).replace(/^#/, "").toUpperCase()}
				onChange={(color) => onPreview(`#${color}`)}
				onChangeEnd={(color) => {
					onPreview(`#${color}`);
					onCommit();
				}}
			/>
		);
	}

	if (param.type === "text") {
		return (
			<Textarea
				value={String(value)}
				onChange={(event) => onPreview(event.currentTarget.value)}
				onBlur={onCommit}
			/>
		);
	}

	if (param.type === "font") {
		const currentFont = String(value);
		const inPresets = TEXT_FONT_PRESETS.some((item) => item.family === currentFont);
		return (
			<Select
				value={currentFont}
				onValueChange={(selected) => {
					const preset = TEXT_FONT_PRESETS.find((item) => item.family === selected);
					void loadFullFont({ family: selected, weights: preset?.weights }).finally(() => {
						onPreview(selected);
						onCommit();
					});
				}}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{!inPresets && currentFont ? (
						<SelectItem value={currentFont}>{currentFont}</SelectItem>
					) : null}
					{TEXT_FONT_PRESETS.map((preset) => (
						<SelectItem key={preset.id} value={preset.family}>
							{preset.label ?? preset.family}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	return null;
}

function NumberParamField({
	param,
	value,
	onPreview,
	onCommit,
}: {
	param: NumberParamDefinition;
	value: number;
	onPreview: (value: number) => void;
	onCommit: () => void;
}) {
	const { min, max, step, displayMultiplier = 1 } = param;
	const displayValue = value * displayMultiplier;
	const clampDisplayValue = (nextDisplayValue: number) =>
		Math.max(
			min,
			max !== undefined ? Math.min(max, nextDisplayValue) : nextDisplayValue,
		);

	const previewFromDisplay = (displayVal: number) => {
		const clamped = clampDisplayValue(
			snapToStep({ value: displayVal, step }),
		);
		onPreview(clamped / displayMultiplier);
	};

	const maxFractionDigits = getFractionDigitsForStep({ step });

	const draft = usePropertyDraft({
		displayValue: formatNumberForDisplay({
			value: displayValue,
			maxFractionDigits,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return clampDisplayValue(snapToStep({ value: parsed, step }));
		},
		onPreview: previewFromDisplay,
		onCommit,
	});

	const handleReset = () => {
		onPreview(param.default);
		onCommit();
	};

	const showLimeSlider =
		(param.key === "volume" || param.key === "opacity") &&
		max !== undefined &&
		Number.isFinite(min) &&
		Number.isFinite(max) &&
		max > min;

	if (showLimeSlider) {
		const pct = Math.min(
			100,
			Math.max(0, ((displayValue - min) / (max - min)) * 100),
		);
		return (
			<div className="space-y-2">
				<NumberField
					icon={param.shortLabel}
					value={draft.displayValue}
					dragSensitivity="slow"
					isDefault={value === param.default}
					onFocus={draft.onFocus}
					onChange={draft.onChange}
					onBlur={draft.onBlur}
					onScrub={previewFromDisplay}
					onScrubEnd={onCommit}
					onReset={handleReset}
				/>
				<div className="relative flex h-4 items-center">
					<div className="bg-muted relative h-1.5 w-full rounded-full">
						<div
							className="h-full rounded-full bg-[#a3e635]"
							style={{ width: `${pct}%` }}
						/>
						<div
							className="border-background bg-foreground pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
							style={{ left: `${pct}%` }}
						/>
					</div>
					<input
						type="range"
						min={min}
						max={max}
						step={step}
						value={displayValue}
						aria-label={param.label}
						onChange={(e) => previewFromDisplay(parseFloat(e.currentTarget.value))}
						onMouseUp={onCommit}
						onTouchEnd={onCommit}
						className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					/>
				</div>
			</div>
		);
	}

	return (
		<NumberField
			icon={param.shortLabel}
			value={draft.displayValue}
			dragSensitivity="slow"
			isDefault={value === param.default}
			onFocus={draft.onFocus}
			onChange={draft.onChange}
			onBlur={draft.onBlur}
			onScrub={previewFromDisplay}
			onScrubEnd={onCommit}
			onReset={handleReset}
		/>
	);
}
