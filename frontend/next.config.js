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
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
  },
  async headers() {
    return [
      {
        source: '/workers/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/codecs/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
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
  webpack: (config, { isServer, webpack }) => {
    // Add support for DICOM files
    config.module.rules.push({
      test: /\.dcm$/,
      use: 'raw-loader',
    });

    // Fix for Cornerstone.js Node.js modules in browser (client-side only)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        buffer: require.resolve('buffer'),
      };
      
      // Add Buffer polyfill for Cornerstone.js
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@cornerstonejs/core', '@cornerstonejs/tools', '@cornerstonejs/dicom-image-loader'],
  },
};

module.exports = nextConfig;