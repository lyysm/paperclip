import { DEFAULT_LOCALE, isSelectableLocale, type SelectableLocale } from "./locales";

const LOCALE_STORAGE_KEY = "paperclip.locale";

export function readStoredLocale(): SelectableLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSelectableLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function resolveInitialLocale(): SelectableLocale {
  return readStoredLocale() ?? DEFAULT_LOCALE;
}

export function persistLocale(locale: SelectableLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore local storage write failures in restricted environments.
  }
}

export function applyLocaleToDocument(locale: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}
