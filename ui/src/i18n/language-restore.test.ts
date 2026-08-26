// @vitest-environment jsdom

import { beforeAll, describe, expect, it } from "vitest";
import zhCN from "./locales/zh-CN.json";

const LOCALE_STORAGE_KEY = "paperclip.locale";
const I18N_INITIALIZATION_TEST_TIMEOUT = 10_000;

// Import the i18n module only after storage is seeded: each test file gets a
// fresh module registry, so this is the first evaluation of the singleton.
describe("restoring a stored locale on load", () => {
  beforeAll(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "zh-CN");
  });

  it("initializes i18next with the persisted locale", { timeout: I18N_INITIALIZATION_TEST_TIMEOUT }, async () => {
    const { i18n, t } = await import(".");
    expect(i18n.language).toBe("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(t("app.noCompanies.title")).toBe(zhCN.app.noCompanies.title);
  });

  it("does not rewrite storage during init", async () => {
    await import(".");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN");
  });
});
