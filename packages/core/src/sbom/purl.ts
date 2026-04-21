export interface ParsedPurl {
  scheme: "pkg";
  type: string;
  namespace?: string;
  name: string;
  version?: string;
}

/**
 * Parse a Package URL (purl) string into its components.
 * Follows the purl spec: pkg:type/namespace/name@version?qualifiers#subpath
 * Returns null for invalid or non-pkg URLs.
 */
export function parsePurl(purl: string): ParsedPurl | null {
  if (!purl || !purl.startsWith("pkg:")) return null;

  // Strip qualifiers and subpath
  let rest = purl.slice(4); // remove "pkg:"
  const hashIdx = rest.indexOf("#");
  if (hashIdx !== -1) rest = rest.slice(0, hashIdx);
  const queryIdx = rest.indexOf("?");
  if (queryIdx !== -1) rest = rest.slice(0, queryIdx);

  // Split type from the rest: type/...
  const slashIdx = rest.indexOf("/");
  if (slashIdx <= 0) return null;

  const type = rest.slice(0, slashIdx);
  let remainder = rest.slice(slashIdx + 1);

  try {
    remainder = decodeURIComponent(remainder);
  } catch {
    return null;
  }

  // Extract version
  let version: string | undefined;
  const atIdx = remainder.lastIndexOf("@");
  if (atIdx !== -1) {
    version = remainder.slice(atIdx + 1);
    remainder = remainder.slice(0, atIdx);
  }

  // Split namespace/name (last segment is name, rest is namespace)
  const lastSlash = remainder.lastIndexOf("/");
  let namespace: string | undefined;
  let name: string;

  if (lastSlash !== -1) {
    namespace = remainder.slice(0, lastSlash);
    name = remainder.slice(lastSlash + 1);
  } else {
    name = remainder;
  }

  if (!name) return null;

  return {
    scheme: "pkg",
    type,
    namespace: namespace || undefined,
    name,
    version: version || undefined,
  };
}
