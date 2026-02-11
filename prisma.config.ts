// @ts-ignore - prisma config doesn't have types
import { defineConfig } from "prisma";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
