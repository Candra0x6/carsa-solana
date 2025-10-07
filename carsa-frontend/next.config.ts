// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // ✅ allows all domains, no need to list them
  },
};

module.exports = nextConfig;
