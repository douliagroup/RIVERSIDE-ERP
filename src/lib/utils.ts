import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitaire pour fusionner les classes Tailwind CSS de manière conditionnelle.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
