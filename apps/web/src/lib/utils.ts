// apps/web/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * A utility function to conditionally join Tailwind CSS class names.
 * It merges classes and resolves conflicts, e.g., `cn('p-2', 'p-4')` results in `'p-4'`.
 * @param {...ClassValue[]} inputs - A list of class names or conditional class objects.
 * @returns {string} The final, merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Generates a universally unique identifier (UUID) using the browser's crypto API.
 * @returns {string} A new UUID string.
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};