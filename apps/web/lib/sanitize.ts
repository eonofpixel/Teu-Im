/**
 * Sanitizes user input to prevent XSS attacks
 * Escapes HTML special characters that could be used for injection
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitizes HTML attributes to prevent attribute-based XSS
 * Removes potentially dangerous characters from attribute values
 */
export function sanitizeAttribute(input: string): string {
  if (!input) return '';

  return input
    .replace(/[<>"'`]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}
