// Brand abbreviations for equipment display
export const brandAbbreviations: Record<string, string> = {
  'Titleist': 'Ti',
  'TaylorMade': 'TM',
  'Callaway': 'Cal',
  'Ping': 'Png',
  'Cobra': 'Cob',
  'Mizuno': 'Miz',
  'Srixon': 'Srx',
  'Cleveland': 'Clv',
  'Odyssey': 'Ody',
  'Scotty Cameron': 'SC',
  'PXG': 'PXG',
  'Honma': 'Hon',
  'Wilson': 'Wil',
  'Bridgestone': 'BS',
  'Tour Edge': 'TE',
  'XXIO': 'XXI',
  'Adams': 'Adm',
  'Nike': 'Nke',
  'Ben Hogan': 'BH',
  'Miura': 'Miu'
};

export function getBrandAbbreviation(brand: string): string {
  return brandAbbreviations[brand] || brand.substring(0, 3).toUpperCase();
}

// Get contrasting color for text overlay
export function getContrastColor(bgColor: string): string {
  // Simple implementation - can be enhanced
  return '#FFFFFF';
}