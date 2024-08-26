export const payment_config_momo = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretkey: process.env.MOMO_SECRET_KEY,
  domain: process.env.MOMO_DOMAIN_SANDBOX,
  // domain: process.env.MOMO_DOMAIN_PRODUCTION,
  redirectUrl: "tymesaving://payment/momo",
  ipnUrl: "https://6396-42-115-92-28.ngrok-free.app/api/payment/momo/ipn",
  requestType: "payWithMethod",
  extraData: ""
}
