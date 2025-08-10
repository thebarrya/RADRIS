/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables
  env: {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
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
      // Proxy specific backend routes, but exclude NextAuth routes
      {
        source: '/api/patients/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:3001/api'}/patients/:path*`,
      },
      {
        source: '/api/examinations/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:3001/api'}/examinations/:path*`,
      },
      {
        source: '/api/reports/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:3001/api'}/reports/:path*`,
      },
      {
        source: '/api/dicom/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:3001/api'}/dicom/:path*`,
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