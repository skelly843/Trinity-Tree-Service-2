import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos uploaded through the site live in Supabase storage; resize them for each screen
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }]
  },
  experimental: {
    // Put the stylesheet in the HTML, so the first paint does not wait on a separate CSS request
    // and can happen before the page scripts run.
    inlineCss: true,
  },
};

export default nextConfig;
