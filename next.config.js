/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "images.unsplash.com",
      },
      {
        hostname: "ik.imagekit.io",
      },
    ],
  },
};

export default nextConfig;
