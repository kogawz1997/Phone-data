module.exports = {
  apps: [
    {
      name: "phone-finance-api",
      cwd: process.cwd(),
      script: "pnpm",
      args: "--filter @koga/api start",
      env: { NODE_ENV: "production" },
    },
    {
      name: "phone-finance-admin",
      cwd: process.cwd(),
      script: "pnpm",
      args: "--filter @koga/admin-web start",
      env: { NODE_ENV: "production" },
    },
    {
      name: "phone-finance-customer",
      cwd: process.cwd(),
      script: "pnpm",
      args: "--filter @koga/customer-web start",
      env: { NODE_ENV: "production" },
    },
  ],
};
