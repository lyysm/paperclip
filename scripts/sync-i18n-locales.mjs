#!/usr/bin/env node
/**
 * sync-i18n-locales.mjs
 *
 * Keeps the ui locale catalog aligned with `en.json`. The runtime validator
 * (`ui/src/i18n/locale-validation.ts`) requires every locale file to have the
 * exact same key set as English, but only `en` and `zh-CN` are hand-maintained
 * (zh-CN is the only selectable translation). This script deep-syncs every
 * other locale file against `en.json`:
 *
 *   - keys missing from a locale are added with the English value (English is
 *     the documented fallback for not-yet-translated strings);
 *   - keys removed from English are dropped from the locale;
 *   - existing translated values are preserved untouched;
 *   - output key order always mirrors `en.json` so catalog diffs stay readable.
 *
 * `zh-CN.json` is skipped: it is maintained by hand alongside `en.json`.
 *
 * Run via `pnpm i18n:sync` after editing `en.json`/`zh-CN.json`.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = path.join(repoRoot, "ui", "src", "i18n", "locales");
const REFERENCE_LOCALE = "en";
const HAND_MAINTAINED = new Set(["en", "zh-CN"]);

function syncNode(reference, candidate, stats) {
  if (typeof reference === "string") {
    return typeof candidate === "string" ? candidate : reference;
  }

  const candidateIsObject =
    candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);

  const result = {};
  for (const [key, referenceValue] of Object.entries(reference)) {
    if (!candidateIsObject || !(key in candidate)) {
      stats.added += 1;
      result[key] = referenceValue;
      continue;
    }
    result[key] = syncNode(referenceValue, candidate[key], stats);
  }
  if (candidateIsObject) {
    for (const key of Object.keys(candidate)) {
      if (!(key in reference)) stats.removed += 1;
    }
  }
  return result;
}

async function main() {
  const files = (await readdir(localesDir)).filter((name) => name.endsWith(".json")).sort();
  if (!files.includes(`${REFERENCE_LOCALE}.json`)) {
    throw new Error(`Reference locale ${REFERENCE_LOCALE}.json not found in ${localesDir}`);
  }

  const reference = JSON.parse(await readFile(path.join(localesDir, `${REFERENCE_LOCALE}.json`), "utf8"));
  let changedFiles = 0;

  for (const file of files) {
    const locale = file.replace(/\.json$/, "");
    if (HAND_MAINTAINED.has(locale)) continue;

    const filePath = path.join(localesDir, file);
    const original = await readFile(filePath, "utf8");
    const candidate = JSON.parse(original);
    const stats = { added: 0, removed: 0 };
    const synced = syncNode(reference, candidate, stats);
    const output = `${JSON.stringify(synced, null, 2)}\n`;

    if (output !== original) {
      await writeFile(filePath, output, "utf8");
      changedFiles += 1;
      console.log(`${file}: +${stats.added} keys filled with English, ${stats.removed} removed`);
    }
  }

  console.log(changedFiles > 0 ? `Synced ${changedFiles} locale files.` : "All locale files already in sync.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
