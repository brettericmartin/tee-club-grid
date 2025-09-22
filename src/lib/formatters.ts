/**
 * Formats a number into a compact representation (e.g., 5.4k, 12.3k, 1.2M)
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '0';
  }
  
  if (value < 1000) {
    return value.toString();
  }
  
  if (value < 1000000) {
    const thousands = value / 1000;
    if (thousands < 10) {
      return `${thousands.toFixed(1)}k`;
    }
    return `${Math.round(thousands)}k`;
  }
  
  const millions = value / 1000000;
  if (millions < 10) {
    return `${millions.toFixed(1)}M`;
  }
  return `${Math.round(millions)}M`;
}

/**
 * Formats a currency value into a compact representation with $ prefix
 */
export function formatCompactCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '$0';
  }
  // Round to 2 decimal places before formatting to avoid floating point issues
  const roundedValue = Math.round(value * 100) / 100;
  return `$${formatCompactNumber(roundedValue)}`;
}

/**
 * Formats a number with thousand separators
 */
export function formatNumberWithCommas(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

/**
 * Formats a currency value with $ prefix and thousand separators
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '$0.00';
  }
  // Round to 2 decimal places to avoid floating point issues
  const roundedValue = Math.round(value * 100) / 100;
  return `$${roundedValue.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}