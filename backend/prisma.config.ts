import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.postgres.prisma",
  seed: "tsx src/db/seed.ts",
});
