#!/usr/bin/env node

const fg = require("fast-glob");
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.resolve(__dirname, "../src/i18n/locales");
const OUTPUT_FILE = path.join(__dirname, "../src/i18n/compiled-i18n.json");

(async () => {
  const files = await fg("**/*.json", { cwd: LOCALES_DIR, absolute: true });

  const resources = {};
  const supportedLanguages = new Set();

  for (const filePath of files) {
    const parts = filePath.split(path.sep);
    const lang = parts[parts.length - 2];
    const ns = path.basename(filePath, ".json");

    supportedLanguages.add(lang);

    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (!resources[lang]) resources[lang] = {};
    resources[lang][ns] = json;
  }

  // Save compiled resources and languages
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      { resources, supportedLanguages: Array.from(supportedLanguages) },
      null,
      2,
    ),
  );

  console.log("✅ i18n resources generated.");
})();
