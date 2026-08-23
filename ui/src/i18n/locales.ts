import type { Resource } from "i18next";

import { assertValidLocaleMessages } from "./locale-validation";

export const DEFAULT_LOCALE = "en" as const;

const localeModules = import.meta.glob("./locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export const localeMessages = Object.fromEntries(
  Object.entries(localeModules).map(([path, messages]) => {
    const locale = path.match(/\/([A-Za-z0-9_-]+)\.json$/)?.[1];
    if (!locale) {
      throw new Error(`Invalid locale file path: ${path}`);
    }
    return [locale, messages];
  }),
);

if (!(DEFAULT_LOCALE in localeMessages)) {
  throw new Error(`Missing default locale messages for ${DEFAULT_LOCALE}`);
}

for (const [locale, messages] of Object.entries(localeMessages)) {
  try {
    assertValidLocaleMessages(messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${locale} locale messages: ${message}`);
  }
}

export const supportedLocales = Object.keys(localeMessages);

/**
 * Locales surfaced in the language switcher. The full catalog stays bundled
 * and validated; this list controls which locales users can activate.
 */
export const SELECTABLE_LOCALES = ["en", "zh-CN"] as const;
export type SelectableLocale = (typeof SELECTABLE_LOCALES)[number];

/** Native endonyms so each option reads correctly regardless of active locale. */
export const LOCALE_DISPLAY_NAMES: Record<SelectableLocale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

for (const locale of SELECTABLE_LOCALES) {
  if (!(locale in localeMessages)) {
    throw new Error(`Selectable locale ${locale} has no locale messages`);
  }
}

export function isSelectableLocale(value: unknown): value is SelectableLocale {
  return typeof value === "string" && (SELECTABLE_LOCALES as readonly string[]).includes(value);
}

export const i18nextResources: Resource = Object.fromEntries(
  Object.entries(localeMessages).map(([locale, messages]) => [locale, { translation: messages }]),
) as Resource;

export type SupportedLocale = keyof typeof localeMessages;
