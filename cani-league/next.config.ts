import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.*", "192.168.*.*", "192.168.0.23", "localhost:3000"],
  compress: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@tanstack/react-table",
      "recharts",
    ],
  },
};

export default nextConfig;
