import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // serve our local SVG assets through next/image; CSP keeps them inert
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
