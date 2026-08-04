import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class name strings/conditions into one, and resolves
 * any conflicting Tailwind classes (e.g. two different "padding" classes)
 * so the last one wins. Every component in components/ui uses this.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
