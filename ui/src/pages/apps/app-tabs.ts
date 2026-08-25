import { Activity, Beaker, Inbox, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { t } from "@/i18n";

export const APP_TABS = [
  { key: "setup", label: "Setup", icon: Settings2 },
  { key: "review", label: "Review", icon: Inbox },
  { key: "permissions", label: "Permissions", icon: ShieldCheck },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "test", label: "Test", icon: Beaker },
  { key: "advanced", label: "Advanced", icon: Wrench },
] as const;

export type AppTabKey = (typeof APP_TABS)[number]["key"];

const APP_TAB_I18N_KEYS: Record<AppTabKey, string> = {
  setup: "appsPage.tabs.setup",
  review: "appsPage.tabs.review",
  permissions: "appsPage.tabs.permissions",
  activity: "appsPage.tabs.activity",
  test: "appsPage.tabs.test",
  advanced: "appsPage.tabs.advanced",
};

/**
 * Tabs hidden for an application that has no live connection (the
 * `AppNotConnected` shell). The Test tab runs real calls against a connected
 * app, so it only appears once the app is connected.
 */
export const CONNECTED_ONLY_APP_TABS: ReadonlySet<AppTabKey> = new Set<AppTabKey>(["test"]);

export function appTabHref(connectionId: string, tab: AppTabKey): string {
  return `/apps/${connectionId}/${tab}`;
}

export function appApplicationTabHref(applicationId: string, tab: AppTabKey): string {
  return `/apps/app/${applicationId}/${tab}`;
}

export function isAppTabKey(value: string | undefined): value is AppTabKey {
  return APP_TABS.some((tab) => tab.key === value);
}

export function appTabLabel(tabKey: AppTabKey): string {
  const tab = APP_TABS.find((candidate) => candidate.key === tabKey);
  return t(APP_TAB_I18N_KEYS[tabKey], { defaultValue: tab?.label ?? "Setup" });
}
