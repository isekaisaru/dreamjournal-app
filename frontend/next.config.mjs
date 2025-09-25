/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // 本番環境で必要なファイルのみを .next/standalone に出力する
  output: "standalone",
  compiler: {
    removeConsole: isProd ? { exclude: ["error"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
