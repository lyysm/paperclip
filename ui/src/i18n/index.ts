import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales, type SelectableLocale } from "./locales";
import { applyLocaleToDocument, persistLocale, resolveInitialLocale } from "./locale-storage";

const initialLocale = resolveInitialLocale();

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

// Keep <html lang> aligned with the active locale for accessibility and
// font/rendering hints. The direct call covers init; the listener covers
// every changeLanguage call.
applyLocaleToDocument(initialLocale);
i18n.on("languageChanged", applyLocaleToDocument);

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

/**
 * Active BCP-47 locale for `Intl` date/number formatting. Falls back to the
 * default locale while i18next is still resolving.
 */
export function currentLocale(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE;
}

/**
 * Explicitly switch the active locale. Persists the choice so it survives
 * reloads; init-time locale resolution never writes storage.
 */
export async function setLocale(locale: SelectableLocale): Promise<void> {
  await i18n.changeLanguage(locale);
  persistLocale(locale);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
