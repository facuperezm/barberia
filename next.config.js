/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "resend.com",
      },
      {
        hostname: "ik.imagekit.io",
      },
      {
        hostname: "joseppons.com",
      },
      {
        hostname: "e00-expansion.uecdn.es",
      },
      {
        hostname: "encrypted-tbn0.gstatic.com",
      },
      {
        hostname: "www.elivelimen.com",
      },
      {
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
