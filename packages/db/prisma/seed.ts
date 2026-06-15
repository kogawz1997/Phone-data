import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: "../../.env" });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_SAMPLE_DATA !== "true") {
    console.log("Production-safe seed: skipped sample data. Set SEED_SAMPLE_DATA=true and run db:seed:sample only for local demos.");
    return;
  }
  console.log("SEED_SAMPLE_DATA=true detected, but sample seed moved to prisma/seed.sample.ts. Run pnpm --filter @repo/db db:seed:sample explicitly.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
