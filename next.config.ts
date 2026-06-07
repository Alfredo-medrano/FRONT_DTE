import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/**
 * Security headers — ISO 27001 A.14 / OWASP Best Practices
 * Applied to all frontend routes served by Next.js.
 *
 * SECURITY FIX (C2): CSP is environment-aware.
 * - Development: allows unsafe-eval (required by Next.js HMR / React DevTools)
 * - Production: unsafe-eval REMOVED — eliminates eval()/Function() XSS vectors
 */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  {
    // Prevent clickjacking
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Block MIME sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Control referrer information
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Restrict browser features
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Force HTTPS (1 year)
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    // XSS Protection (legacy browsers)
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Content Security Policy — environment-differentiated
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // SECURITY FIX (C2): No unsafe-eval in production
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'", // Tailwind injects inline styles
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
