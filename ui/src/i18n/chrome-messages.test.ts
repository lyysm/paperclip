// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import zhCN from "./locales/zh-CN.json";
import { i18n, setLocale, t } from ".";

/**
 * The app-chrome catalog (nav, sidebar menus, auth, global toggles) is the
 * translation surface users see everywhere. This guards the zh-CN catalog at
 * the key spots the chrome renders — every namespace resolves and
 * interpolation flows through — while locale-validation.test.ts separately
 * enforces key parity across all bundled locales.
 */
describe("zh-CN app chrome messages", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("zh-CN");
  });

  it("translates the sidebar navigation labels", () => {
    expect(t("nav.newTask")).toBe(zhCN.nav.newTask);
    expect(t("nav.dashboard")).toBe(zhCN.nav.dashboard);
    expect(t("nav.tasks")).toBe(zhCN.nav.tasks);
    expect(t("nav.agents")).toBe(zhCN.nav.agents);
    expect(t("nav.settings")).toBe(zhCN.nav.settings);
    expect(t("nav.collapseSidebar")).toBe(zhCN.nav.collapseSidebar);
  });

  it("translates the agent section actions and sort choices", () => {
    expect(t("agents.newAgent")).toBe(zhCN.agents.newAgent);
    expect(t("agents.seeAll")).toBe(zhCN.agents.seeAll);
    expect(t("agents.sortTop")).toBe(zhCN.agents.sortTop);
    expect(t("agents.sortAlphabetical")).toBe(zhCN.agents.sortAlphabetical);
    expect(t("agents.pausedToast")).toBe(zhCN.agents.pausedToast);
  });

  it("translates the company switcher and account menu", () => {
    expect(t("companyMenu.switchCompany")).toBe(zhCN.companyMenu.switchCompany);
    expect(t("companyMenu.noCompanies")).toBe(zhCN.companyMenu.noCompanies);
    expect(t("accountMenu.viewProfile")).toBe(zhCN.accountMenu.viewProfile);
    expect(t("common.signOut")).toBe(zhCN.common.signOut);
  });

  it("translates the auth page", () => {
    expect(t("auth.signInTitle")).toBe(zhCN.auth.signInTitle);
    expect(t("auth.password")).toBe(zhCN.auth.password);
    expect(t("auth.fillRequired")).toBe(zhCN.auth.fillRequired);
  });

  it("interpolates names into Chinese templates", () => {
    expect(t("companyMenu.invitePeopleTo", { name: "Acme" })).toBe("邀请成员加入 Acme");
    expect(t("agents.openActions", { name: "Nova" })).toBe("打开 Nova 的操作");
    expect(t("language.switchTo", { name: "English" })).toBe("切换到English");
  });

  it("localizes the remaining user-facing technical labels", () => {
    expect(t("nav.betaBadge")).toBe("测试版");
    expect(t("issuesList.tokensCount", { count: 3 })).toBe("3 个令牌");
    expect(t("userProfile.tokens")).toBe("令牌");
    expect(t("costsPage.tokensShort", { count: 12 })).toBe("12 个令牌");
    expect(t("skillStudio.slugLabel")).toBe("标识符（slug）");
    expect(t("skillStudio.studio")).toBe("工作室");
    expect(t("companySettings.logo")).toBe("徽标");
    expect(t("routines.comingSoon")).toBe("即将推出");
    expect(t("routines.active")).toBe("已启用");
    expect(t("toolsPage.smokeLab.title")).toBe("冒烟实验室");
  });
});
