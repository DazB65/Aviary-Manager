import helmet from "helmet";

function originFromUrl(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function buildContentSecurityPolicyDirectives() {
  const analyticsOrigin = originFromUrl(process.env.VITE_ANALYTICS_ENDPOINT);
  const mapsProxyOrigin = "https://forge.butterfly-effect.dev";
  const googleMapsOrigins = ["https://maps.googleapis.com", "https://maps.gstatic.com"];

  return {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": uniq([
      "'self'",
      "'wasm-unsafe-eval'",
      analyticsOrigin,
      mapsProxyOrigin,
      ...googleMapsOrigins,
    ]),
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": uniq(["'self'", analyticsOrigin, mapsProxyOrigin, ...googleMapsOrigins]),
    "media-src": ["'self'", "data:", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };
}

export function securityHeaders() {
  return helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            useDefaults: true,
            directives: buildContentSecurityPolicyDirectives(),
          }
        : false,
  });
}
