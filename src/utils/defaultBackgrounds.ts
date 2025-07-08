import { bagBackgrounds } from '@/components/BackgroundLayer';

// Default background IDs for bags
export const defaultBackgroundIds = ['midwest-lush', 'desert', 'ocean', 'mountain'] as const;

export function getDefaultBackground(bagId: string): string {
  // Use bag ID to consistently select a background ID
  const index = bagId.charCodeAt(0) % defaultBackgroundIds.length;
  return defaultBackgroundIds[index];
}