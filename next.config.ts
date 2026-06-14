import type { NextConfig } from "next";

// Origin of the upstream API. Server-side only (not NEXT_PUBLIC) so it stays out
// of the browser bundle; the staging backend is the default.
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ?? "https://admin-moderator-backend-staging.up.railway.app";

const nextConfig: NextConfig = {
  images: {
    // serve our local SVG assets through next/image; CSP keeps them inert
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Same-origin proxy: the browser hits /proxy-api/* on our own domain and Next
  // forwards it to the backend server-side, so the request is never cross-origin
  // and the backend's missing CORS headers stop mattering.
  async rewrites() {
    return [
      {
        source: "/proxy-api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
