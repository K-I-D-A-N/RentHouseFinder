// Format a number as currency (e.g., 15,000 ETB)
export function formatETB(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 ETB';
  return amount.toLocaleString('en-ET') + ' ETB';
}

// Format a date string (YYYY-MM-DD) to readable (e.g., May 22, 2026)
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
