import type { ToolProfileStatus, ToolProfileSummary, ToolProfileWithDetails } from "@paperclipai/shared";
import { t } from "@/i18n";

/**
 * Prosumer copy for the access-profile index (PAP-10997, AP1). Reads the
 * server-computed `summary` and renders the friendly "Allows" / "Assigned to"
 * lines the table shows. Vocabulary gate: nothing here says
 * binding/entry/selector/priority — only "tools", "apps", "agents".
 */

function countLabel(n: number, singularKey: string, pluralKey: string, singularDefault: string, pluralDefault: string): string {
  return t(n === 1 ? singularKey : pluralKey, {
    defaultValue: n === 1 ? singularDefault : pluralDefault,
    count: n,
  });
}

/** "9 tools · 3 apps" / "All tools" / "All except 2 tools". */
export function allowsLabel(summary: ToolProfileSummary): string {
  if (summary.accessMode === "all_except") {
    return summary.excludedToolCount === 0
      ? t("toolsPage.profiles.summary.allTools", { defaultValue: "All tools" })
      : t(summary.excludedToolCount === 1 ? "toolsPage.profiles.summary.allExceptSingular" : "toolsPage.profiles.summary.allExcept", {
          defaultValue: summary.excludedToolCount === 1 ? "All except {{count}} tool" : "All except {{count}} tools",
          count: summary.excludedToolCount,
        });
  }
  const parts = [countLabel(summary.allowedToolCount, "toolsPage.profiles.summary.toolSingular", "toolsPage.profiles.summary.tools", "{{count}} tool", "{{count}} tools")];
  if (summary.allowedApplicationCount > 0) {
    parts.push(countLabel(summary.allowedApplicationCount, "toolsPage.profiles.summary.appSingular", "toolsPage.profiles.summary.apps", "{{count}} app", "{{count}} apps"));
  }
  return parts.join(" · ");
}

export interface AssignedLabel {
  text: string;
  /** A profile with no assignment has no effect — the index shows a quiet hint. */
  unassigned: boolean;
}

/** "Company default" / "2 agents" / "Not assigned yet". */
export function assignedLabel(summary: ToolProfileSummary): AssignedLabel {
  if (summary.isCompanyDefault) return { text: t("toolsPage.profiles.summary.companyDefault", { defaultValue: "Company default" }), unassigned: false };
  if (summary.appliesToAgentCount > 0) {
    return {
      text: countLabel(summary.appliesToAgentCount, "toolsPage.profiles.summary.agentSingular", "toolsPage.profiles.summary.agents", "{{count}} agent", "{{count}} agents"),
      unassigned: false,
    };
  }
  if (summary.assignmentCount > 0) {
    return {
      text: countLabel(summary.assignmentCount, "toolsPage.profiles.summary.assignmentSingular", "toolsPage.profiles.summary.assignments", "{{count}} assignment", "{{count}} assignments"),
      unassigned: false,
    };
  }
  return { text: t("toolsPage.profiles.summary.notAssigned", { defaultValue: "Not assigned yet" }), unassigned: true };
}

export const STATUS_LABEL: Record<ToolProfileStatus, string> = {
  draft: "Draft",
  active: "Active",
  disabled: "Off",
  archived: "Archived",
};

export function profileStatusLabel(status: ToolProfileStatus): string {
  return t(`toolsPage.profiles.status.${status}`, { defaultValue: STATUS_LABEL[status] });
}

export function isDraft(profile: Pick<ToolProfileWithDetails, "status">): boolean {
  return profile.status === "draft";
}
