// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import zhCN from "./locales/zh-CN.json";
import { i18n, setLocale, t } from ".";

const LOCALE_STORAGE_KEY = "paperclip.locale";

describe("language switching", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts in English when no locale is stored", () => {
    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches to Chinese, persists the choice, and updates <html lang>", async () => {
    await setLocale("zh-CN");

    expect(i18n.language).toBe("zh-CN");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(t("app.noCompanies.title")).toBe(zhCN.app.noCompanies.title);
  });

  it("switches back to English and overwrites the stored choice", async () => {
    await setLocale("zh-CN");
    await setLocale("en");

    expect(i18n.language).toBe("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(t("app.noCompanies.title")).toBe("Create your first company");
  });
});
