/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  webpack: (config) => {
    // Add support for DICOM files
    config.module.rules.push({
      test: /\.dcm$/,
      use: 'raw-loader',
    });
    
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['cornerstone-core'],
  },
};

module.exports = nextConfig;