/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Output standalone for Cloud Run deployment
  output: 'standalone',
  // Environment variables (must be prefixed with NEXT_PUBLIC_ for client-side)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000',
  },
};

export default nextConfig;

