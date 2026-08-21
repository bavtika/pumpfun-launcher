/**
 * Route remote coin images through the local server proxy (/api/img).
 * Public IPFS gateways are slow or blocked in some networks; the server
 * fetches the file itself and the browser always loads from localhost.
 */
export function coinImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return url;
  return `/api/img?u=${encodeURIComponent(url)}`;
}
