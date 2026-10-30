export const DEFAULT_SITE_URL = "https://www.scro.io";

function isVercelAppHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "vercel.app" || host.endsWith(".vercel.app");
}

// Normalize bare scro.io to https://www.scro.io so sitemaps and canonical tags match the 200 OK host (avoiding 308 redirects).
function normalizeCanonicalSiteUrl(raw: string): string {
  const cleaned = raw.replace(/\/$/, "");
  try {
    const url = new URL(cleaned);
    if (url.hostname.toLowerCase() === "scro.io") {
      url.hostname = "www.scro.io";
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through
  }
  return cleaned;
}

function isCustomPublicSiteUrl(raw: string | undefined): raw is string {
  if (!raw || !isPublicHttpUrl(raw)) return false;
  try {
    const url = new URL(raw);
    return !isVercelAppHost(url.hostname);
  } catch {
    return false;
  }
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const cleaned = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    // Ignore legacy explainer-web.vercel.app production env var in favor of www.scro.io
    if (!cleaned.includes("explainer-web.vercel.app")) {
      return normalizeCanonicalSiteUrl(cleaned);
    }
    return DEFAULT_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    if (!isVercelAppHost(process.env.VERCEL_PROJECT_PRODUCTION_URL)) {
      return normalizeCanonicalSiteUrl(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }
    return DEFAULT_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// Public canonical base URL used for sitemaps, robots.txt, llms.txt, and SEO metadata.
export function getSiteUrl() {
  if (isCustomPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
    return normalizeCanonicalSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (isCustomPublicSiteUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    return normalizeCanonicalSiteUrl(process.env.NEXT_PUBLIC_APP_URL);
  }
  return DEFAULT_SITE_URL;
}

function ipv4Octets(hostname: string): number[] | undefined {
  const parts = hostname.split(".");
  if (parts.length !== 4) return undefined;
  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return NaN;
    return Number(part);
  });
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return undefined;
  }
  return octets;
}

function isPrivateOrLocalHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1"
  ) {
    return true;
  }

  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const ipv4 = ipv4Octets(mapped?.[1] || host);
  if (ipv4) {
    const [a, b] = ipv4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (!host.includes(":")) return false;
  const prefix = parseInt(host.split(":")[0] || "", 16);
  if (!Number.isFinite(prefix)) return false;
  // fc00::/7 unique-local, fe80::/10 link-local
  return (prefix & 0xfe00) === 0xfc00 || (prefix & 0xffc0) === 0xfe80;
}

// Higgsfield webhooks must be HTTP(S) to a public IP, with no URL credentials.
export function isPublicHttpUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  return !isPrivateOrLocalHost(url.hostname);
}
