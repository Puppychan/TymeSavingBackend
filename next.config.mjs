/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
          {
            source: "/api/(.*)",
            headers: [
              { key: "Access-Control-Allow-Credentials", value: "true" },
              { key: "Access-Control-Allow-Origin", value: "*" }, // later change if have specific domain from frontend
              { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS, POST, PUT, DELETE, PATCH" },
              { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Content-Length, Content-Type, Date, Authorization" },
            ]
          },
        //   {
        //     source: "/api/payment/vnpay",
        //     headers: [
        //       { key: "Access-Control-Allow-Credentials", value: "true" },
        //       { key: "Access-Control-Allow-Origin", value: "https://production.vnpayment.vn" },
        //       { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS, POST" },
        //       { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Content-Length, Content-Type, Date, Authorization" },
        //     ]
        //   }
        ];
      },
};

export default nextConfig;
