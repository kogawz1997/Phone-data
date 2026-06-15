import fs from "node:fs";

const sqliteSchemaPath = new URL("./schema.prisma", import.meta.url);
const postgresSchemaPath = new URL("./schema.postgres.prisma", import.meta.url);

let schema = fs.readFileSync(sqliteSchemaPath, "utf8");

schema = schema.replace(
  /datasource db \{[\s\S]*?\n\}/,
  `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`,
);

// Repair accidental line breaks in the canonical schema before generating the PostgreSQL schema.
schema = schema.replace(/\n\s*provider\s*\n\s*MdmProviderType\s*\n/g, "\n  provider       MdmProviderType\n");

fs.writeFileSync(postgresSchemaPath, schema);
console.log("Rebuilt schema.postgres.prisma from schema.prisma with PostgreSQL provider.");
