// Chi lay ma lo; khong dieu huong theo URL nhung van chua trong QR.
export function parseHueLegendQR(payload: string, currentOrigin: string): string | null {
  if (typeof payload !== 'string') return null;
  const text = payload.trim();
  if (!text || text.length > 2048) return null;
  const normalizeCode = (value: string | null): string | null => {
    const code = value?.trim().toUpperCase() || '';
    return /^[A-Z0-9_-]{3,64}$/.test(code) ? code : null;
  };
  if (/^[A-Z0-9_-]{3,64}$/i.test(text)) return normalizeCode(text);
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== currentOrigin) return null;
    const hashQuery = url.hash.includes('?') ? new URLSearchParams(url.hash.slice(url.hash.indexOf('?') + 1)) : null;
    return normalizeCode(url.searchParams.get('batch') || url.searchParams.get('batchCode') || hashQuery?.get('batch') || hashQuery?.get('batchCode') || null);
  } catch { return null; }
}
