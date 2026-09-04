import type { NextConfig } from "next";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cyberclubportal.com";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        ROOT_DOMAIN,
        `www.${ROOT_DOMAIN}`,
        `community.${ROOT_DOMAIN}`,
        `learn.${ROOT_DOMAIN}`,
        `challenges.${ROOT_DOMAIN}`,
      ],
    },
  },
  allowedDevOrigins: [
    "localhost",
    "portal.localhost",
    "community.localhost",
    "learn.localhost",
    "challenges.localhost",
    "cyberclubportal.com",
  ],
};

export default nextConfig;
