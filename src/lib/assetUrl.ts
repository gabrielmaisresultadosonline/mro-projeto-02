// Resolves Lovable asset pointer URLs to absolute URLs so they work
// when the app is self-hosted (VPS) outside of *.lovable.app.
// Lovable-hosted paths start with "/__l5e/" and are proxied by Lovable's CDN.
const LOVABLE_CDN_ORIGIN = "https://ig-mro-boost.lovable.app";

const LOCAL_BACKEND_ENABLED = import.meta.env.VITE_USE_LOCAL_BACKEND === "true";
const LOCAL_BACKEND_ORIGIN = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  ""
).replace(/\/+$/, "");

/**
 * Converte URLs absolutas de qualquer storage legado para o storage da VPS.
 * Os registros antigos guardam o host original, mas bucket e caminho continuam
 * iguais depois da migração. A conversão só ocorre no build de cutover.
 */
export function storageAssetUrl(url: string): string {
  if (!url || !LOCAL_BACKEND_ENABLED || !LOCAL_BACKEND_ORIGIN) return url;

  const storagePath = url.match(
    /^https?:\/\/[^/]+\.supabase\.co\/(storage\/v1\/object\/(?:public|authenticated)\/.*)$/i,
  );

  return storagePath ? `${LOCAL_BACKEND_ORIGIN}/${storagePath[1]}` : url;
}

export function assetUrl(url: string): string {
  if (!url) return url;
  const storageUrl = storageAssetUrl(url);
  if (storageUrl !== url) return storageUrl;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/__l5e/")) {
    if (typeof window !== "undefined" && window.location.hostname.endsWith(".lovable.app")) {
      return url; // same-origin on Lovable
    }
    return `${LOVABLE_CDN_ORIGIN}${url}`;
  }
  return url;
}
