/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

// Dev mode: run as server with API proxy to backend
if (process.env.NODE_ENV === 'development') {
  delete nextConfig.output;
  nextConfig.rewrites = async () => [
    { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
  ];
}

module.exports = nextConfig;
