import {
  ClipboardPaste,
  FlaskConical,
  Layers,
  Network,
  ScrollText,
  Server,
  Shield,
  TerminalSquare,
} from "lucide-react";
import { t } from "@/i18n";

/**
 * The Advanced door is mounted under `/apps/advanced` (PAP-10862, plan D8).
 * `/tools` and `/tools/:tab` redirect here; every in-surface link is built off
 * this base so the developer door has a single canonical home.
 */
export const ADVANCED_TOOLS_BASE = "/apps/advanced";

/** Build a tab href off the Advanced base. `run-your-own` is the bare base path (the door's default tab). */
export function advancedTabHref(tab: ToolTabKey): string {
  return tab === "run-your-own" ? ADVANCED_TOOLS_BASE : `${ADVANCED_TOOLS_BASE}/${tab}`;
}

// M8a/M8b — the prosumer-facing Advanced setup tabs (PAP-10839 wires). The only
// screens where "MCP" vocabulary is permitted (PAP-10827).
export const ADVANCED_TABS = [
  { key: "run-your-own", label: "Run your own", icon: TerminalSquare },
  { key: "paste-config", label: "Paste a config", icon: ClipboardPaste },
] as const;

// The pre-Apps developer surface, kept reachable behind the Advanced door.
// `smoke-lab` (PAP-13343 / S2) is experimental — hidden from the sidebar unless
// `experimental.enableSmokeLab` is on (see `isExperimentalToolTab` +
// `useSmokeLabEnabled`), and the route/tab itself gates on the same flag.
export const DEVELOPER_TABS = [
  { key: "gateways", label: "Gateways", icon: Network },
  { key: "profiles", label: "Profiles", icon: Layers },
  { key: "policies", label: "Rules", icon: Shield },
  { key: "runtime", label: "Health", icon: Server },
  { key: "audit", label: "Activity", icon: ScrollText },
  { key: "smoke-lab", label: "Smoke Lab", icon: FlaskConical },
] as const;

export const TOOL_TABS = [...ADVANCED_TABS, ...DEVELOPER_TABS] as const;

export type ToolTabKey = (typeof TOOL_TABS)[number]["key"];

const TOOL_TAB_I18N_KEYS: Record<ToolTabKey, string> = {
  "run-your-own": "toolsPage.tabs.runYourOwn",
  "paste-config": "toolsPage.tabs.pasteConfig",
  gateways: "toolsPage.tabs.gateways",
  profiles: "toolsPage.tabs.profiles",
  policies: "toolsPage.tabs.rules",
  runtime: "toolsPage.tabs.health",
  audit: "toolsPage.tabs.activity",
  "smoke-lab": "toolsPage.tabs.smokeLab",
};

export function toolTabLabel(key: ToolTabKey): string {
  const tab = TOOL_TABS.find((item) => item.key === key);
  return t(TOOL_TAB_I18N_KEYS[key], { defaultValue: tab?.label ?? key });
}

export function isAdvancedSetupTab(tab: ToolTabKey): boolean {
  return ADVANCED_TABS.some((t) => t.key === tab);
}

/** Developer tabs hidden behind an experimental flag (gated in the sidebar). */
export function isExperimentalToolTab(tab: ToolTabKey): boolean {
  return tab === "smoke-lab";
}
