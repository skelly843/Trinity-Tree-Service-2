import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Put the stylesheet in the HTML, so the first paint does not wait on a separate CSS request
    // and can happen before the page scripts run.
    inlineCss: true,
  },
};

export default nextConfig;
