export const scaledPx = (px: number): string =>
  `calc(${px}px * var(--font-scale))`
