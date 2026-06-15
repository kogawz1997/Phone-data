import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@repo/auth",
    "@repo/contracts",
    "@repo/db",
    "@repo/device-control",
    "@repo/notifications",
    "@repo/payments",
    "@repo/shared",
    "@repo/storage"
  ],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false }
};

export default nextConfig;
