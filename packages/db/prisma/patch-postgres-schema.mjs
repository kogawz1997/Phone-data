import fs from "node:fs";

const schemaPath = new URL("./schema.postgres.prisma", import.meta.url);
let schema = fs.readFileSync(schemaPath, "utf8");

function patchModel(modelName, patcher) {
  const pattern = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, "m");
  const match = schema.match(pattern);
  if (!match) {
    throw new Error(`Cannot find Prisma model ${modelName} in schema.postgres.prisma`);
  }
  schema = schema.replace(pattern, patcher(match[0]));
}

patchModel("MdmEnrollment", (model) => {
  if (model.includes("contractId")) return model;
  return model
    .replace("deviceId       String?", "deviceId       String?\n  contractId     String?")
    .replace(
      "device       Device?      @relation(fields: [deviceId], references: [id])",
      "device       Device?      @relation(fields: [deviceId], references: [id])\n  contract     Contract?    @relation(fields: [contractId], references: [id])",
    )
    .replace("@@index([deviceId])", "@@index([deviceId])\n  @@index([contractId])");
});

patchModel("MdmCommand", (model) => {
  if (model.includes("contractId")) return model;
  return model
    .replace("deviceId    String", "deviceId    String\n  contractId  String?")
    .replace(
      "device Device @relation(fields: [deviceId], references: [id])",
      "device Device @relation(fields: [deviceId], references: [id])\n  contract Contract? @relation(fields: [contractId], references: [id])",
    )
    .replace("@@index([deviceId])", "@@index([deviceId])\n  @@index([contractId])");
});

fs.writeFileSync(schemaPath, schema);
console.log("Patched schema.postgres.prisma relation fields for deployment.");
