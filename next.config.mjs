/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
          {
            source: "/api/(.*)",
            headers: [
              { key: "Access-Control-Allow-Credentials", value: "true" },
              { key: "Access-Control-Allow-Origin", value: "*" }, // later change if have specific domain from frontend
              { key: "Access-Control-Allow-Methods", value: "*" },
              { key: "Access-Control-Allow-Headers", value: "*" },
            ]
          },
        ];
      },
};

export default nextConfig;
