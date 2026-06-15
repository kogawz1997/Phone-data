import crypto from "node:crypto";
import fs from "node:fs";

const target = ".env";
if (fs.existsSync(target)) {
  console.error(".env already exists. Move it first if you want to regenerate.");
  process.exit(1);
}

const secret = (bytes = 48) => crypto.randomBytes(bytes).toString("base64url");
const env = `NODE_ENV=development
API_PORT=4000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ADMIN_WEB_URL=http://localhost:3000
CUSTOMER_WEB_URL=http://localhost:3002
PUBLIC_API_URL=http://localhost:4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002
DATABASE_URL="file:./dev.db"
JWT_SECRET="${secret()}"
ORG_NAME="KOGA Lease MDM SaaS"
ORG_ID="default_org"
ORG_TAX_ID=""
ORG_PHONE=""
ADMIN_EMAIL="owner@local.test"
ADMIN_PASSWORD="${secret(18)}Aa1!"
ADMIN_NAME="Platform Owner"
PAYMENT_PROVIDER="manual"
PAYMENT_WEBHOOK_SECRET="${secret(32)}"
SLIP_VERIFY_PROVIDER="manual"
NOTIFICATION_PROVIDER="local"
NOTIFICATION_WEBHOOK_SECRET="${secret(32)}"
UPLOAD_DIR="./uploads"
PUBLIC_UPLOAD_BASE_URL="http://localhost:4000/uploads"
MAX_UPLOAD_BYTES="8000000"
DEVICE_CONTROL_PROVIDER="mock"
DEVICE_CONTROL_DRY_RUN="true"
DEVICE_CONTROL_MODE="LEASE_TO_OWN_ASSET_PROTECTION"
DEVICE_CONTROL_WEBHOOK_SECRET="${secret(32)}"
CRON_SECRET="${secret(32)}"
BUSINESS_MODEL="LEASE_TO_OWN"
STORE_TRIAL_DAYS="14"
PUBLIC_STORE_SIGNUP_URL="http://localhost:3000/signup"
PLATFORM_OWNER_DASHBOARD_URL="http://localhost:3000/platform"
ANDROID_MANAGEMENT_PROJECT_ID=""
ANDROID_MANAGEMENT_ENTERPRISE_NAME=""
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON="./certs/google-service-account.json"
ANDROID_MANAGEMENT_CALLBACK_URL="http://localhost:4000/mdm/android/signup-callback"
ANDROID_MANAGEMENT_WEBHOOK_SECRET="${secret(32)}"
ANDROID_MANAGEMENT_DEFAULT_POLICY="lease-basic"
ANDROID_ENROLLMENT_TOKEN_DURATION="86400s"
ANDROID_ENROLLMENT_ONE_TIME_ONLY="true"
APPLE_MDM_BASE_URL="http://localhost:4000"
APPLE_MDM_APNS_CERT_PATH="./certs/apple-mdm-apns.pem"
APPLE_MDM_APNS_KEY_PATH="./certs/apple-mdm-apns-key.pem"
APPLE_MDM_APNS_TOPIC=""
APPLE_MDM_APNS_HOST="https://api.push.apple.com"
APPLE_ABM_SERVER_TOKEN_PATH="./certs/apple-abm-server-token.p7m"
APPLE_MDM_PROFILE_SIGNING_CERT_PATH="./certs/profile-signing.pem"
APPLE_MDM_PROFILE_SIGNING_KEY_PATH="./certs/profile-signing-key.pem"
APPLE_MDM_CHECKIN_URL="http://localhost:4000/mdm/apple/checkin"
APPLE_MDM_SERVER_URL="http://localhost:4000/mdm/apple/connect"
`;
fs.writeFileSync(target, env);
console.log("Created .env with random secrets. Save ADMIN_EMAIL/ADMIN_PASSWORD somewhere safe.");
