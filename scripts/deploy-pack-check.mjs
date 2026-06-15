import fs from "node:fs";

const required = [
  "docker-compose.prod.yml",
  "infra/docker/Dockerfile.api",
  "infra/docker/Dockerfile.admin",
  "infra/docker/Dockerfile.customer",
  "infra/caddy/Caddyfile",
  ".env.production.template",
  "infra/scripts/deploy.sh",
  "infra/scripts/update.sh",
  "infra/scripts/backup.sh",
  "infra/scripts/restore.sh",
  "infra/scripts/install-ubuntu-docker.sh",
  "infra/systemd/koga-mdm.service",
  "docs/deploy/DEPLOY_VPS_DOCKER_TH.md",
  "docs/deploy/DEPLOY_FILES_MAP_TH.md"
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Deploy pack missing files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const compose = fs.readFileSync("docker-compose.prod.yml", "utf8");
for (const service of ["postgres", "redis", "api", "admin-web", "customer-web", "caddy"]) {
  if (!compose.includes(`${service}:`)) {
    console.error(`docker-compose.prod.yml missing service: ${service}`);
    process.exit(1);
  }
}

const env = fs.readFileSync(".env.production.template", "utf8");
for (const key of ["APP_DOMAIN", "CUSTOMER_DOMAIN", "API_DOMAIN", "POSTGRES_PASSWORD", "JWT_SECRET", "ALLOWED_ORIGINS"]) {
  if (!env.includes(`${key}=`)) {
    console.error(`.env.production.template missing key: ${key}`);
    process.exit(1);
  }
}

console.log("Deploy pack check OK");
