// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyLocaleToDocument,
  persistLocale,
  readStoredLocale,
  resolveInitialLocale,
} from "./locale-storage";

const LOCALE_STORAGE_KEY = "paperclip.locale";

describe("locale storage", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    vi.restoreAllMocks();
  });

  it("returns null when no locale is stored", () => {
    expect(readStoredLocale()).toBeNull();
  });

  it("reads a stored selectable locale", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "zh-CN");
    expect(readStoredLocale()).toBe("zh-CN");
  });

  it("rejects stored values that are not selectable locales", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
    expect(readStoredLocale()).toBeNull();
    localStorage.setItem(LOCALE_STORAGE_KEY, "en-US");
    expect(readStoredLocale()).toBeNull();
    localStorage.setItem(LOCALE_STORAGE_KEY, "");
    expect(readStoredLocale()).toBeNull();
  });

  it("returns null when reading storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(readStoredLocale()).toBeNull();
  });

  it("falls back to the default locale when nothing valid is stored", () => {
    expect(resolveInitialLocale()).toBe("en");
    localStorage.setItem(LOCALE_STORAGE_KEY, "zh-CN");
    expect(resolveInitialLocale()).toBe("zh-CN");
  });

  it("persists a locale to storage", () => {
    persistLocale("zh-CN");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN");
  });

  it("ignores storage write failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(() => persistLocale("zh-CN")).not.toThrow();
  });

  it("applies the locale to document.documentElement.lang", () => {
    applyLocaleToDocument("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
