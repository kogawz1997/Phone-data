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

function patchModel(modelName, patcher) {
  const pattern = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, "m");
  const match = schema.match(pattern);
  if (!match) throw new Error(`Cannot find Prisma model ${modelName}`);
  schema = schema.replace(pattern, patcher(match[0]));
}

function removeDuplicateField(model, fieldName) {
  let seen = false;
  return model
    .split("\n")
    .filter((line) => {
      if (!new RegExp(`^\\s*${fieldName}\\s+`).test(line)) return true;
      if (!seen) {
        seen = true;
        return true;
      }
      return false;
    })
    .join("\n");
}

patchModel("MdmEnrollment", (model) => removeDuplicateField(model, "contractId"));
patchModel("MdmCommand", (model) => removeDuplicateField(model, "contractId"));

fs.writeFileSync(postgresSchemaPath, schema);
console.log("Rebuilt schema.postgres.prisma from schema.prisma with PostgreSQL provider.");
