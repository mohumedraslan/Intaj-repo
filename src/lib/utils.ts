// src/lib/utils.ts
// Utility for className merging (tailwind/shadcn style)
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
