import { describe, expect, it } from "vitest";

import zhCN from "./locales/zh-CN.json";

/**
 * zh-CN spot checks for the page-body catalog groups added after the app
 * chrome (see chrome-messages.test.ts for the chrome-era groups). Mirrors
 * that file's style: assert a representative sample per surface plus the
 * interpolation placeholders the components rely on.
 */

const zh = zhCN as Record<string, unknown>;

type Messages = Record<string, unknown>;

function group(name: string): Messages {
  const value = zh[name];
  if (!value || typeof value !== "object") throw new Error(`Missing zh-CN group: ${name}`);
  return value as Messages;
}

function entry(scope: Messages, key: string): string {
  const value = scope[key];
  if (typeof value !== "string") throw new Error(`Missing zh-CN key: ${key}`);
  return value;
}

function nested(scope: Messages, ...path: string[]): Messages {
  let current: unknown = scope;
  for (const segment of path) {
    if (!current || typeof current !== "object") throw new Error(`Missing zh-CN nested path: ${path.join(".")}`);
    current = (current as Messages)[segment];
  }
  return current as Messages;
}

describe("zh-CN page-body messages", () => {
  it("translates shared status labels", () => {
    const statuses = group("statuses");
    const issue = nested(statuses, "issue");
    expect(entry(issue, "in_progress")).toBe("进行中");
    expect(entry(issue, "done")).toBe("已完成");
    const priority = nested(statuses, "priority");
    expect(entry(priority, "critical")).toBe("紧急");
    expect(entry(priority, "change")).toContain("{{label}}");
  });

  it("translates relative time with the count placeholder", () => {
    const time = group("time");
    expect(entry(time, "justNow")).toBe("刚刚");
    expect(entry(time, "minutesAgo")).toContain("{{count}}");
    expect(entry(time, "hoursAgo")).toContain("{{count}}");
  });

  it("translates the command palette and shortcuts", () => {
    const commandPalette = group("commandPalette");
    expect(entry(commandPalette, "placeholder")).toContain("搜索");
    expect(entry(commandPalette, "createNewTask")).toBe("新建任务");

    const shortcuts = group("shortcuts");
    expect(entry(shortcuts, "title")).toBe("键盘快捷键");
    expect(entry(shortcuts, "archiveItem")).toBe("归档条目");
  });

  it("translates the new-task dialog including interpolations", () => {
    const dialog = group("newIssueDialog");
    expect(entry(dialog, "taskTitle")).toBe("任务标题");
    expect(entry(dialog, "createdWithWarnings")).toContain("{{ref}}");
    expect(entry(dialog, "openIssue")).toContain("{{ref}}");
    expect(entry(dialog, "reusingWorkspace")).toContain("{{name}}");
    expect(entry(dialog, "reusingWorkspace")).toContain("{{source}}");
    const effort = nested(dialog, "effort");
    expect(entry(effort, "xhigh")).toBe("超高");
    const workMode = nested(dialog, "workMode");
    expect(entry(workMode, "planning")).toBe("计划模式");
  });

  it("translates the tasks list surface", () => {
    const issuesList = group("issuesList");
    expect(entry(issuesList, "searchTasks")).toBe("搜索任务...");
    expect(entry(issuesList, "noTasksMatch")).toContain("没有符合");
    expect(entry(issuesList, "renderingOf")).toContain("{{total}}");
    const quickFilter = nested(issuesList, "quickFilter");
    expect(entry(quickFilter, "all")).toBe("全部");
    const filterLabel = nested(issuesList, "filterLabel");
    expect(entry(filterLabel, "in_progress")).toBe("进行中");
    const column = nested(issuesList, "column");
    expect(entry(column, "assignee")).toBe("负责人");
  });

  it("translates activity feed verbs and composite sentences", () => {
    const activity = group("activity");
    const verb = nested(activity, "verb", "issue");
    expect(entry(verb, "created")).toBe("创建了");
    expect(entry(verb, "comment_added")).toBe("评论了");
    const action = nested(activity, "action", "issue");
    expect(entry(action, "monitor_triggered")).toBe("触发了监控");
    expect(entry(activity, "madeResponsible")).toContain("{{name}}");
    expect(entry(activity, "changedStatusFromToOn")).toContain("{{from}}");
  });

  it("translates dashboard, search, timeline, inbox, and approvals", () => {
    expect(entry(group("dashboard"), "agentsEnabled")).toBe("已启用智能体");
    expect(entry(group("dashboard"), "activeBudgetIncidents_other")).toContain("{{count}}");

    const searchPage = group("searchPage");
    expect(entry(searchPage, "initialTitle")).toContain("搜索");
    expect(entry(searchPage, "noMatchInScope")).toContain("{{scope}}");
    expect(entry(nested(searchPage, "sort"), "relevance")).toBe("相关性");

    expect(entry(group("timeline"), "title")).toBe("工作时间线");
    expect(entry(group("timeline"), "windowFromTo")).toContain("{{from}}");

    const inbox = group("inbox");
    expect(entry(inbox, "tabMine")).toBe("我的");
    expect(entry(inbox, "markAllConfirmBody")).toContain("{{count}}");
    expect(entry(nested(inbox, "blockedSortBy"), "urgency")).toBe("最紧急");

    expect(entry(group("approvals"), "pending")).toBe("待处理");
  });

  it("translates approval detail, what-needs-me, and decision queue pages", () => {
    const approvalDetail = group("approvalDetail");
    expect(entry(approvalDetail, "backToApprovals")).toBe("返回审批");
    expect(entry(approvalDetail, "decisionNote")).toContain("{{note}}");
    expect(entry(approvalDetail, "commentsTitle")).toContain("{{count}}");
    expect(entry(approvalDetail, "reviewLinkedTask_one")).toBe("查看关联任务");

    const whatNeedsMe = group("whatNeedsMe");
    expect(entry(whatNeedsMe, "allCaughtUp")).toBe("您已全部处理完毕");
    expect(entry(whatNeedsMe, "bundleProposed_other")).toContain("{{agent}}");
    expect(entry(whatNeedsMe, "bundleProposed_other")).toContain("{{count}}");
    expect(entry(whatNeedsMe, "agingNote")).toContain("{{days}}");

    const decisionQueue = group("decisionQueue");
    expect(entry(decisionQueue, "autoSeedingOn")).toBe("自动入队已开启");
    expect(entry(decisionQueue, "seedingEnabledNote")).toContain("——");
    expect(entry(decisionQueue, "reasonOptional")).toContain("（可选）");
  });

  it("translates the agents list and new-agent form", () => {
    const agentsPage = group("agentsPage");
    expect(entry(agentsPage, "orgChartView")).toBe("组织架构图视图");
    expect(entry(agentsPage, "sandboxProvider")).toContain("{{provider}}");
    expect(entry(agentsPage, "agentCount_other")).toContain("{{count}}");
    expect(entry(agentsPage, "liveRunsCount")).toBe("进行中（{{count}}）");

    const newAgentForm = group("newAgentForm");
    expect(entry(newAgentForm, "title")).toBe("新建智能体");
    expect(entry(newAgentForm, "companySkillsHelper")).toContain("公司技能库");
    expect(entry(newAgentForm, "firstAgentNote")).toContain("CEO");
  });

  it("translates the cases list and case detail pages", () => {
    const casesPage = group("casesPage");
    expect(entry(casesPage, "searchPlaceholder")).toBe("搜索案例...");
    expect(entry(casesPage, "emptyTitle")).toBe("还没有案例");
    expect(entry(casesPage, "emptyDescription")).toContain("工作产物");
    expect(entry(casesPage, "caseCount_other")).toContain("{{count}}");
    expect(entry(casesPage, "emptyFlagSuffix")).toContain("实验性");

    const caseDetail = group("caseDetail");
    expect(entry(caseDetail, "backToCases")).toBe("← 返回案例");
    expect(entry(caseDetail, "attachmentsHeading")).toContain("{{count}}");
    expect(entry(caseDetail, "createLabelValue")).toContain("{{name}}");
    expect(entry(caseDetail, "copyKeyLine")).toContain("{{value}}");
    expect(entry(caseDetail, "fileCount_one")).toBe("{{count}} 个文件");
  });

  it("translates project detail, user profile, and costs pages", () => {
    const projectDetail = group("projectDetail");
    expect(entry(projectDetail, "summaryTitle")).toBe("项目摘要");
    expect(entry(projectDetail, "archivedToast")).toContain("{{name}}");
    expect(entry(projectDetail, "pausedByBudgetHardStop")).toContain("预算硬停");

    const userProfile = group("userProfile");
    expect(entry(userProfile, "selectCompany")).toContain("用户资料");
    expect(entry(userProfile, "usageTooltip")).toContain("{{tokens}}");
    expect(entry(userProfile, "billedThrough")).toContain("{{name}}");

    const costsPage = group("costsPage");
    expect(entry(costsPage, "inferenceLedger")).toBe("推理台账");
    expect(entry(costsPage, "financeNetSubtitle")).toContain("{{debits}}");
    expect(entry(costsPage, "utilizationOfBudget")).toContain("{{percent}}");
    expect(entry(nested(costsPage, "preset"), "7d")).toBe("最近 7 天");
    expect(entry(costsPage, "debitsSubtitle_one")).toContain("{{count}}");
  });

  it("translates the company environments page", () => {
    const environmentsPage = group("environmentsPage");
    expect(entry(environmentsPage, "addEnvironmentTitle")).toBe("添加环境");
    expect(entry(environmentsPage, "editEnvironmentTitle")).toBe("编辑环境");
    expect(entry(environmentsPage, "discardConfirm")).toContain("未保存");
    expect(entry(environmentsPage, "managedByPaperclip")).toBe("由 Paperclip 托管");
    expect(entry(environmentsPage, "sandboxProviderWithSummary")).toContain("{{provider}}");
    expect(entry(environmentsPage, "sandboxProviderWithSummary")).toContain("{{summary}}");
    expect(entry(environmentsPage, "environmentReadyBody")).toContain("{{name}}");
    expect(entry(environmentsPage, "customImageTitle")).toBe("自定义镜像");
    expect(entry(nested(environmentsPage, "terminalStatus"), "connected")).toBe("已连接");
    expect(entry(nested(environmentsPage, "terminalClose"), "setup_cancelled")).toBe("设置会话已取消。");
    expect(entry(nested(environmentsPage, "sessionStatus"), "capturing")).toBe("正在捕获模板");
    expect(entry(nested(environmentsPage, "capability"), "supportedLabel")).toBe("模板设置");
    expect(entry(environmentsPage, "notInUseWithDrift")).toContain("{{summary}}");
    expect(entry(environmentsPage, "templateRefTitle")).toContain("{{id}}");
  });

  it("translates the small pages, search components, and blocked-inbox labels", () => {
    expect(entry(group("notFound"), "routeNotExist")).toBe("此路由不存在。");
    expect(entry(group("companiesPage"), "deleteConfirm")).toContain("无法撤销");
    expect(entry(group("companiesPage"), "agentCount_one")).toBe("{{count}} 个智能体");
    expect(entry(group("goalsPage"), "addGoal")).toBe("添加目标");
    expect(entry(group("orgPage"), "breadcrumb")).toBe("组织架构图");
    expect(entry(group("workspacesPage"), "showingOf")).toContain("{{shown}}");
    expect(entry(group("workspacesPage"), "showingOf")).toContain("{{total}}");

    const searchPage = group("searchPage");
    expect(entry(nested(searchPage, "filterBar"), "assignee")).toBe("负责人");
    expect(entry(nested(searchPage, "filterMenu"), "filterBy")).toContain("{{label}}");
    expect(entry(nested(searchPage, "zeroResults"), "title")).toContain("筛选");
    expect(entry(nested(searchPage, "zeroResults"), "activeFiltersHide_other")).toContain("{{count}}");
    expect(entry(nested(searchPage, "matchSource"), "identifier")).toBe("编号");

    const blockedInbox = group("blockedInbox");
    expect(entry(nested(blockedInbox, "variant"), "needs_decision")).toBe("需要决策");
    expect(entry(nested(blockedInbox, "reason"), "open_recovery_issue")).toBe("恢复进行中");
    expect(entry(nested(blockedInbox, "stoppedAge"), "hours")).toContain("{{count}}");
  });
});
