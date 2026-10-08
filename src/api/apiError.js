const fallback = 'Request failed.';

export function apiErrorMessage(error, status) {
  // Internal server failures should never expose database errors or tracebacks.
  if (status >= 500) return fallback;
  const detail = error?.detail;
  if (typeof detail === 'string') return detail.trim() || fallback;
  if (!Array.isArray(detail)) return fallback;

  const messages = detail.flatMap(item => {
    if (!item || typeof item.msg !== 'string' || !item.msg.trim()) return [];
    const location = Array.isArray(item.loc)
      ? item.loc.filter(part => typeof part === 'string' || typeof part === 'number').join('.')
      : '';
    // Deliberately omit input, ctx, and any other server-provided diagnostic fields.
    return [location ? `${location}: ${item.msg.trim()}` : item.msg.trim()];
  });
  return messages.join('; ') || fallback;
}
