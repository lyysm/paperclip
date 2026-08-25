import { Activity, LayoutGrid, KeyRound, Wrench, Boxes } from "lucide-react";
import { t } from "@/i18n";

/**
 * Gateway detail tabs (PAP-11200). Terminology is locked by the approved
 * PAP-11178 design of record: Overview · Apps & tools · Tokens · Activity ·
 * Advanced. Raw protocol / JSON / transport details live under Advanced.
 */
export const GATEWAY_TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "apps", label: "Apps & tools", icon: Boxes },
  { key: "tokens", label: "Tokens", icon: KeyRound },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "advanced", label: "Advanced", icon: Wrench },
] as const;

const GATEWAY_TAB_I18N_KEYS: Record<GatewayTabKey, string> = {
  overview: "appsPage.gateways.tabs.overview",
  apps: "appsPage.gateways.tabs.appsAndTools",
  tokens: "appsPage.gateways.tabs.tokens",
  activity: "appsPage.gateways.tabs.activity",
  advanced: "appsPage.gateways.tabs.advanced",
};

export type GatewayTabKey = (typeof GATEWAY_TABS)[number]["key"];

export function gatewayTabHref(gatewayId: string, tab: GatewayTabKey): string {
  return `/apps/gateways/${gatewayId}/${tab}`;
}

export function isGatewayTabKey(value: string | undefined): value is GatewayTabKey {
  return GATEWAY_TABS.some((tab) => tab.key === value);
}

export function gatewayTabLabel(tabKey: GatewayTabKey): string {
  const tab = GATEWAY_TABS.find((candidate) => candidate.key === tabKey);
  return t(GATEWAY_TAB_I18N_KEYS[tabKey], { defaultValue: tab?.label ?? "Overview" });
}
