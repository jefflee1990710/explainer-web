"use client";

import { forwardRef, useCallback } from "react";
import { useSelectionContext } from "@/opencut/selection/context";
import { SELECTABLE_ITEM_ATTRIBUTE } from "@/opencut/selection/attributes";
import type { SelectableItemProps } from "@/opencut/selection/types";
import { cn } from "@/opencut/utils/ui";

function setForwardedRef<T>({
	ref,
	value,
}: {
	ref: React.ForwardedRef<T>;
	value: T | null;
}) {
	if (typeof ref === "function") {
		ref(value);
		return;
	}

	if (ref) {
		ref.current = value;
	}
}

export const SelectableItem = forwardRef<HTMLDivElement, SelectableItemProps>(
	function SelectableItem(
		{
			id,
			children,
			className,
			onClick,
			onKeyDown,
			onMouseDown,
			onContextMenu,
			tabIndex,
			...rest
		}: SelectableItemProps,
		forwardedRef,
	) {
		const {
			isBoxSelecting,
			isSelected,
			handleItemClick,
			handleItemMouseDown,
			registerItem,
		} = useSelectionContext();
		const isItemSelected = isSelected(id);
		const stateClassName = cn(
			"relative",
			isBoxSelecting && "pointer-events-none",
			isItemSelected && "rounded-sm ring-1 ring-[#12141c]",
		);

		const handleRef = useCallback(
			(element: HTMLDivElement | null) => {
				registerItem(id, element);
				setForwardedRef({ ref: forwardedRef, value: element });
			},
			[forwardedRef, id, registerItem],
		);

		return (
			<div
				ref={handleRef}
				className={cn(stateClassName, className)}
				{...{ [SELECTABLE_ITEM_ATTRIBUTE]: "true" }}
				role="option"
				aria-selected={isItemSelected}
				tabIndex={tabIndex ?? 0}
				onClick={(event) => {
					onClick?.(event);
					if (event.defaultPrevented) {
						return;
					}

					handleItemClick({ event, id });
				}}
				onMouseDown={(event) => {
					onMouseDown?.(event);
					if (event.defaultPrevented) {
						return;
					}

					handleItemMouseDown({ event, id });
				}}
				onKeyDown={(event) => {
					onKeyDown?.(event);
					if (event.defaultPrevented || event.target !== event.currentTarget) {
						return;
					}

					if (event.key !== "Enter" && event.key !== " ") {
						return;
					}

					event.preventDefault();
					handleItemClick({ event, id });
				}}
				onContextMenu={onContextMenu}
				{...rest}
			>
				{children}
			</div>
		);
	},
);
