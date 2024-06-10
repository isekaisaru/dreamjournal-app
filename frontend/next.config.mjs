/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      automaticNameDelimiter: '.',
    };
    return config;
  },
};

export default nextConfig;
