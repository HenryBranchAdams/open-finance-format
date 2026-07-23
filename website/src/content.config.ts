import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import {
  docsCollection,
  partialsCollection,
} from "@cloudflare/nimbus-docs/content";

export const collections = {
  docs: defineCollection(
    docsCollection({
      schemaFields: {
        audience: z.literal("human").optional(),
        authority: z.enum(["normative", "guidance", "example"]),
        sourcePath: z.string().optional(),
      },
    }),
  ),
  partials: defineCollection(partialsCollection()),
};
