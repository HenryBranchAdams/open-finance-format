#!/usr/bin/env node

const value = process.env.OFF_SITE_URL;

if (!value) {
  throw new Error("OFF_SITE_URL is required for a deployable build.");
}

const url = new URL(value);
if (url.protocol !== "https:" || url.hostname.endsWith(".invalid")) {
  throw new Error("OFF_SITE_URL must be the exact HTTPS production origin.");
}

console.log(`Using production origin ${url.origin}`);
