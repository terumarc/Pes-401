import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.*", "192.168.*.*", "192.168.0.23", "localhost:3000"],
  compress: true,
  experimental: {
    // Al volver a una pantalla ya visitada se reutiliza durante 30 s en vez de pedirla otra vez.
    staleTimes: { dynamic: 30, static: 300 },
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@tanstack/react-table",
      "recharts",
    ],
  },
};

export default nextConfig;
