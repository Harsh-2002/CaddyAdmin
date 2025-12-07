import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Only use static export in production build
  // In dev, allow dynamic routes
  ...(isDev ? {} : { output: 'export' }),

  // Rewrites only work in development (next dev)
  // In production (export), the Go backend handles routing
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
