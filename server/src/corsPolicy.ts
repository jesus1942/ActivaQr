export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function createOriginValidator(allowedOrigins: string[], isProduction: boolean) {
  const allowed = new Set(
    allowedOrigins
      .map(normalizeOrigin)
      .filter((origin): origin is string => origin !== null),
  );

  return (origin?: string): boolean => {
    if (!origin) return true;
    const normalized = normalizeOrigin(origin);
    if (!normalized) return false;
    if (allowed.has(normalized)) return true;
    if (!isProduction) {
      const url = new URL(normalized);
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    }
    return false;
  };
}
