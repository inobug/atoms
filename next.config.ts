import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/preview": ["./node_modules/@babel/**/*"],
  },
};

export default nextConfig;
