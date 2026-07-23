import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";
import nimbus, { defineConfig as defineNimbusConfig } from "@cloudflare/nimbus-docs";
import { tableScroll } from "@cloudflare/nimbus-docs/markdown";

const site = process.env.OFF_SITE_URL ?? "http://localhost:4321";

const nimbusConfig = defineNimbusConfig({
  site,
  title: "OFF · Open Finance Format",
  description:
    "An open standard for portable, versioned, source-backed financial research.",
  locale: "en",
  github: "https://github.com/HenryBranchAdams/open-finance-format",
  socialImage: "/og.png",
  socialImageAlt: "Open Finance Format documentation preview",
  sidebar: {
    scope: "full",
    defaultCollapsed: false,
    items: [
      {
        label: "Start Here",
        icon: "ph:compass",
        items: ["docs", "docs/get-started"],
      },
      {
        label: "Guides",
        icon: "ph:path",
        autogenerate: { directory: "docs/guides" },
      },
      {
        label: "Concepts",
        icon: "ph:cube",
        autogenerate: { directory: "docs/concepts" },
      },
      {
        label: "Specification",
        icon: "ph:file-text",
        autogenerate: { directory: "docs/specification" },
      },
      {
        label: "Reference",
        icon: "ph:terminal-window",
        autogenerate: { directory: "docs/reference" },
      },
      {
        label: "Examples",
        icon: "ph:chart-line-up",
        autogenerate: { directory: "docs/examples" },
      },
      {
        label: "Conformance & Release",
        icon: "ph:seal-check",
        autogenerate: { directory: "docs/conformance" },
      },
      {
        label: "Project Status",
        icon: "ph:flag",
        autogenerate: { directory: "docs/status" },
      },
    ],
  },
});

export default defineConfig({
  site,
  output: "static",
  outDir: "./dist/client",
  trailingSlash: "always",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
  integrations: [
    icon(),
    react(),
    nimbus(nimbusConfig, {
      rules: {
        "nimbus/frontmatter-shape": "error",
        "nimbus/internal-link": "error",
        "nimbus/heading-hierarchy": "error",
        "nimbus/duplicate-heading-text": "error",
      },
      markdown: {
        hastPlugins: [tableScroll()],
      },
    }),
  ],
});
