import { isIP } from "node:net";

/** True when the address is safe to fetch (not private, link-local, multicast, etc.). */
export function isPublicAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) return isPublicIPv4(address);
  if (kind === 6) return isPublicIPv6(address);
  return false;
}

function isPublicIPv4(ip: string): boolean {
  const octets = ip.split(".").map((p) => Number(p));
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = octets;
  if (a === 0) return false;
  if (a === 10) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && b >= 18 && b <= 19) return false;
  if (a >= 224) return false;
  return true;
}

function extractMappedIPv4(ipv6: string): string | null {
  const lower = ipv6.toLowerCase();
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

function isPublicIPv6(ip: string): boolean {
  const mapped = extractMappedIPv4(ip);
  if (mapped) return isPublicIPv4(mapped);

  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return false;
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return false;

  const first = firstIPv6Hextet(lower);
  if ((first & 0xfe00) === 0xfc00) return false;
  if ((first & 0xffc0) === 0xfe80) return false;

  return true;
}

function firstIPv6Hextet(addr: string): number {
  if (addr.startsWith("::")) {
    const after = addr.slice(2);
    if (!after || after.startsWith(":")) return 0;
    return parseInt(after.split(":")[0] || "0", 16);
  }
  const head = addr.split("::")[0];
  return parseInt(head.split(":")[0] || "0", 16);
}
