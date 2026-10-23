"use client";

import { resolveAnimationPathValueAtTime } from "@/opencut/animation";
import { useElementPlayhead } from "@/opencut/components/editor/panels/properties/hooks/use-element-playhead";
import { useKeyframedParamProperty } from "@/opencut/components/editor/panels/properties/hooks/use-keyframed-param-property";
import { PropertyParamField } from "@/opencut/components/editor/panels/properties/components/property-param-field";
import type { ParamValue, ParamValues } from "@/opencut/params";
import {
	getElementParams,
	readElementParamValue,
	writeElementParamValue,
	type ElementParamDefinition,
} from "@/opencut/params/registry";
import type { TimelineElement } from "@/opencut/timeline";
import type { MediaTime } from "@/opencut/wasm";

/** Pairs of parameters rendered side-by-side in a 2-column grid row. */
const PAIRED_NEXT_KEY: Record<string, string> = {
	"transform.positionX": "transform.positionY",
	"transform.scaleX": "transform.scaleY",
	fontSize: "color",
	fontWeight: "fontStyle",
	textAlign: "textDecoration",
	letterSpacing: "lineHeight",
	strokeWidth: "strokeColor",
	shadowColor: "shadowBlur",
	shadowOffsetX: "shadowOffsetY",
	"background.color": "background.cornerRadius",
	"background.paddingX": "background.paddingY",
	"background.offsetX": "background.offsetY",
};

/** Optional section header inserted above specific parameter keys. */
const SECTION_GROUP_TITLE: Record<string, string> = {
	content: "Caption text",
	fontFamily: "Typography",
	strokeWidth: "Outline stroke",
	shadowColor: "Drop shadow",
	"background.enabled": "Background plate",
	"transform.positionX": "Position & scale",
	opacity: "Blending & opacity",
	volume: "Audio level",
};

export function ElementParamsTab({
	element,
	trackId,
	paramKeys,
	sectionKey,
}: {
	element: TimelineElement;
	trackId: string;
	paramKeys?: readonly string[];
	sectionKey: string;
}) {
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const params = getElementParams({ element }).filter(
		(param) => !paramKeys || paramKeys.includes(param.key),
	);
	const baseValues = buildValues({ element, params });
	const visibleParams = params.filter((param) =>
		isVisible({ param, values: baseValues }),
	);

	// Group visible params into rows (single full-width or 2-column paired row)
	const rows: Array<{
		groupTitle?: string;
		items: ElementParamDefinition[];
	}> = [];
	const consumed = new Set<string>();

	for (let i = 0; i < visibleParams.length; i++) {
		const param = visibleParams[i];
		if (!param || consumed.has(param.key)) continue;
		consumed.add(param.key);

		const groupTitle = SECTION_GROUP_TITLE[param.key];
		const partnerKey = PAIRED_NEXT_KEY[param.key];
		const partner = partnerKey
			? visibleParams.find((p) => p.key === partnerKey && !consumed.has(p.key))
			: undefined;

		if (partner) {
			consumed.add(partner.key);
			rows.push({ groupTitle, items: [param, partner] });
		} else {
			rows.push({ groupTitle, items: [param] });
		}
	}

	return (
		<div
			key={`${element.id}:${sectionKey}`}
			className="divide-border flex flex-col divide-y"
		>
			{rows.map((row) => {
				const rowKey = row.items.map((item) => item.key).join("+");
				return (
					<div key={rowKey} className="space-y-2.5 px-3.5 py-3">
						{row.groupTitle ? (
							<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
								{row.groupTitle}
							</p>
						) : null}
						{row.items.length === 2 ? (
							<div className="grid grid-cols-2 gap-2.5">
								{row.items.map((param) => (
									<ElementParamField
										key={param.key}
										element={element}
										trackId={trackId}
										param={param}
										baseValue={baseValues[param.key] ?? param.default}
										localTime={localTime}
										isPlayheadWithinElementRange={isPlayheadWithinElementRange}
									/>
								))}
							</div>
						) : (
							row.items.map((param) => (
								<ElementParamField
									key={param.key}
									element={element}
									trackId={trackId}
									param={param}
									baseValue={baseValues[param.key] ?? param.default}
									localTime={localTime}
									isPlayheadWithinElementRange={isPlayheadWithinElementRange}
								/>
							))
						)}
					</div>
				);
			})}
		</div>
	);
}

function ElementParamField({
	element,
	trackId,
	param,
	baseValue,
	localTime,
	isPlayheadWithinElementRange,
}: {
	element: TimelineElement;
	trackId: string;
	param: ElementParamDefinition;
	baseValue: ParamValue;
	localTime: MediaTime;
	isPlayheadWithinElementRange: boolean;
}) {
	const resolvedValue = resolveAnimationPathValueAtTime({
		animations: element.animations,
		propertyPath: param.key,
		localTime,
		fallbackValue: baseValue,
	});
	const animatedParam = useKeyframedParamProperty({
		param,
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: param.key,
		localTime,
		isPlayheadWithinElementRange,
		resolvedValue,
		buildBaseUpdates: ({ value }) =>
			writeElementParamValue({ element, param, value }),
	});

	return (
		<PropertyParamField
			param={param}
			value={resolvedValue}
			onPreview={animatedParam.onPreview}
			onCommit={animatedParam.onCommit}
			keyframe={
				param.keyframable === false
					? undefined
					: {
							isActive: animatedParam.isKeyframedAtTime,
							isDisabled: !isPlayheadWithinElementRange,
							onToggle: animatedParam.toggleKeyframe,
						}
			}
		/>
	);
}

function buildValues({
	element,
	params,
}: {
	element: TimelineElement;
	params: readonly ElementParamDefinition[];
}): ParamValues {
	const values: ParamValues = {};
	for (const param of params) {
		const value = readElementParamValue({ element, param });
		if (value !== null) {
			values[param.key] = value;
		}
	}
	return values;
}

function isVisible({
	param,
	values,
}: {
	param: ElementParamDefinition;
	values: ParamValues;
}): boolean {
	return (param.dependencies ?? []).every((dependency) =>
		areParamValuesEqual({
			left: values[dependency.param],
			right: dependency.equals,
		}),
	);
}

function areParamValuesEqual({
	left,
	right,
}: {
	left: ParamValue | undefined;
	right: ParamValue;
}): boolean {
	return left === right;
}
