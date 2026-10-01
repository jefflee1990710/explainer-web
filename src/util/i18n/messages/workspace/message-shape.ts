// Locale files share keys with en; translated values are plain strings.
export type MessageShape<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly MessageShape<U>[]
    : T extends object
      ? { [K in keyof T]: MessageShape<T[K]> }
      : T;
