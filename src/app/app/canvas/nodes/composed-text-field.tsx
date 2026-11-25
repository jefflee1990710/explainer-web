"use client";

// Canvas text fields. Uncontrolled so 速成 / 拼音 can finish a character.
// Autosave re-renders the graph on each saved key; writing `value` back into a
// focused field cancels that composition. The canvas hears the text after a
// character is chosen, or on a keystroke that is not composing.

import { useEffect, useRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange"> & {
  value: string;
  onValue: (next: string) => void;
};

export function ComposedTextarea({
  value,
  onValue,
  onFocus,
  onBlur,
  onCompositionStart,
  onCompositionEnd,
  ...rest
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const focused = useRef(false);
  const composing = useRef(false);
  const committed = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || composing.current) return;
    // A parent re-render (autosave status, undo) must not touch the DOM while
    // this field is focused and already showing the last text it published.
    if (focused.current && value === committed.current) return;
    if (el.value !== value) el.value = value;
    committed.current = value;
  }, [value]);

  const publish = (next: string) => {
    if (next === committed.current) return;
    committed.current = next;
    onValue(next);
  };

  return (
    <textarea
      {...rest}
      ref={ref}
      defaultValue={value}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focused.current = false;
        composing.current = false;
        publish(event.currentTarget.value);
        onBlur?.(event);
      }}
      onCompositionStart={(event) => {
        composing.current = true;
        onCompositionStart?.(event);
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        publish(event.currentTarget.value);
        onCompositionEnd?.(event);
      }}
      onChange={(event) => {
        if (composing.current || (event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing)) return;
        publish(event.currentTarget.value);
      }}
    />
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
  value: string;
  onValue: (next: string) => void;
};

export function ComposedInput({
  value,
  onValue,
  onFocus,
  onBlur,
  onCompositionStart,
  onCompositionEnd,
  ...rest
}: InputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const composing = useRef(false);
  const committed = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || composing.current) return;
    if (focused.current && value === committed.current) return;
    if (el.value !== value) el.value = value;
    committed.current = value;
  }, [value]);

  const publish = (next: string) => {
    if (next === committed.current) return;
    committed.current = next;
    onValue(next);
  };

  return (
    <input
      {...rest}
      ref={ref}
      defaultValue={value}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focused.current = false;
        composing.current = false;
        publish(event.currentTarget.value);
        onBlur?.(event);
      }}
      onCompositionStart={(event) => {
        composing.current = true;
        onCompositionStart?.(event);
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        publish(event.currentTarget.value);
        onCompositionEnd?.(event);
      }}
      onChange={(event) => {
        if (composing.current || (event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing)) return;
        publish(event.currentTarget.value);
      }}
    />
  );
}
