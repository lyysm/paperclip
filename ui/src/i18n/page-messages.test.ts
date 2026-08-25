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

  it("translates the Skill Studio surface", () => {
    const skillStudio = group("skillStudio");
    expect(entry(skillStudio, "studio")).toBe("Studio");
    expect(entry(skillStudio, "newSkillTitle")).toBe("新技能");
    expect(entry(skillStudio, "createNewSkillTitle")).toBe("创建新技能");
    expect(entry(skillStudio, "forkSkillTitle")).toBe("复刻技能");
    expect(entry(skillStudio, "forkingName")).toContain("{{name}}");
    expect(entry(skillStudio, "unsavedEdits")).toBe("未保存的编辑");
    expect(entry(skillStudio, "versionHistory")).toBe("版本历史");
    expect(entry(skillStudio, "restoreAsV")).toContain("{{version}}");
    expect(entry(skillStudio, "templateReadyBody")).toContain("{{name}}");
    expect(entry(skillStudio, "deleteTemplateConfirm")).toContain("{{name}}");
    expect(entry(skillStudio, "diffVersions")).toContain("{{left}}");
    expect(entry(nested(skillStudio, "gate"), "pickAgent")).toBe("请选择要运行的智能体");
    expect(entry(skillStudio, "testTaskExpired")).toBe("测试任务已过期");
    expect(entry(skillStudio, "openTestTask")).toContain("测试任务");
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

  it("translates the agent detail page", () => {
    const agentDetail = group("agentDetail");
    expect(entry(agentDetail, "apiKeys")).toBe("API 密钥");
    expect(entry(agentDetail, "discardConfigChanges")).toContain("未保存");
    expect(entry(agentDetail, "invalidChainBody")).toContain("{{name}}");
    expect(entry(agentDetail, "onBehalfOf")).toContain("{{name}}");
    expect(entry(agentDetail, "deleteFileConfirm")).toContain("{{path}}");
    expect(entry(agentDetail, "showingFirstKb")).toContain("{{shown}}");
    expect(entry(agentDetail, "clearSessionConfirm_other")).toContain("{{count}}");
    expect(entry(nested(agentDetail, "builtIn"), "title")).toBe("内置智能体");
    expect(entry(nested(agentDetail, "tabs"), "secrets")).toBe("密钥");
    expect(entry(nested(agentDetail, "metrics"), "input")).toBe("输入");
    expect(entry(nested(agentDetail, "costs"), "totalCost")).toBe("总成本");
    expect(entry(nested(agentDetail, "sourceLabel"), "on_demand")).toBe("按需");
    expect(entry(nested(agentDetail, "runRetry", "reason"), "transient_failure")).toBe("瞬时故障");
    expect(entry(nested(agentDetail, "runRetry"), "retryScheduled")).toBe("已安排重试");
    expect(entry(nested(agentDetail, "taskAssignHint"), "ceoRole")).toContain("CEO");
  });

  it("translates the secrets page", () => {
    const secretsPage = group("secretsPage");
    expect(entry(secretsPage, "title")).toBe("密钥");
    expect(entry(secretsPage, "newSecret")).toBe("新建密钥");
    expect(entry(secretsPage, "eachUser")).toBe("每位用户");
    expect(entry(secretsPage, "deploymentDefault")).toBe("部署默认值");
    expect(entry(secretsPage, "deleteSecretBody")).toContain("{{name}}");
    expect(entry(secretsPage, "referencedBy_other")).toContain("{{count}}");
    expect(entry(secretsPage, "referencedBy_other")).toContain("{{name}}");
    expect(entry(secretsPage, "rotatedToastBody")).toContain("{{version}}");
    expect(entry(secretsPage, "pathSecretCount_other")).toContain("{{count}}");
    expect(entry(secretsPage, "secretStatusToast")).toContain("{{status}}");
    expect(entry(nested(secretsPage, "tabs"), "vaults")).toBe("提供方密钥库");
    expect(entry(nested(secretsPage, "statusLabel"), "disabled")).toBe("已停用");
    expect(entry(nested(secretsPage, "vaultStatus"), "coming_soon")).toBe("即将推出");
    expect(entry(nested(secretsPage, "viewMode"), "folders")).toBe("文件夹");
    expect(entry(nested(secretsPage, "deliveryMode"), "env")).toBe("环境变量");
    expect(entry(nested(secretsPage, "consumerType"), "agent_api")).toBe("智能体 API");
  });

  it("translates the pipelines page", () => {
    const pipelinesPage = group("pipelinesPage");
    expect(entry(pipelinesPage, "createPipeline")).toBe("创建流水线");
    expect(entry(pipelinesPage, "newPipeline")).toBe("新建流水线");
    expect(entry(pipelinesPage, "noPipelinesYet")).toBe("还没有流水线。");
    expect(entry(pipelinesPage, "moveTitle")).toContain("{{title}}");
    expect(entry(pipelinesPage, "moveToName")).toContain("{{name}}");
    expect(entry(pipelinesPage, "approveCount")).toContain("{{count}}");
    expect(entry(pipelinesPage, "waitingForDecision")).toContain("{{pipeline}}");
    expect(entry(pipelinesPage, "suggestionPrompt")).toContain("{{pipeline}}");
    expect(entry(pipelinesPage, "learningReviewDecided")).toContain("{{actor}}");
    expect(entry(pipelinesPage, "pipelineCount")).toContain("{{count}}");
    expect(entry(pipelinesPage, "reviewQueue")).toBe("评审队列");
    expect(entry(pipelinesPage, "learnings")).toBe("经验沉淀");
    expect(entry(pipelinesPage, "nestedView")).toBe("嵌套视图");
    expect(entry(pipelinesPage, "flatList")).toBe("平铺列表");
    expect(entry(pipelinesPage, "columnAttention")).toBe("需关注");
    expect(entry(pipelinesPage, "overrideAndMove")).toBe("覆盖并移动");
  });

  it("translates the company skills page", () => {
    const companySkills = group("companySkills");
    expect(entry(companySkills, "storeTitle")).toBe("技能商店");
    expect(entry(companySkills, "searchPlaceholder")).toBe("搜索技能、作者、分类…");
    expect(entry(companySkills, "createNewSkill")).toBe("创建新技能");
    expect(entry(companySkills, "browseCatalog")).toBe("浏览技能库");
    expect(entry(companySkills, "installSkill")).toBe("安装技能");
    expect(entry(companySkills, "forkSkillTitle")).toBe("复刻技能");
    expect(entry(companySkills, "forkingName")).toContain("{{name}}");
    expect(entry(companySkills, "createdBody")).toContain("{{name}}");
    expect(entry(companySkills, "movedCardBody")).toContain("{{folder}}");
    expect(entry(companySkills, "movedCardBody")).toContain("{{name}}");
    expect(entry(companySkills, "removeSkillDescription")).toContain("智能体");
    expect(entry(companySkills, "skillCount_one")).toContain("{{count}}");
    expect(entry(companySkills, "skillCount_other")).toContain("{{count}}");
    expect(entry(companySkills, "scanAcrossWorkspace_other")).toContain("{{count}}");
    expect(entry(companySkills, "tabInstalled")).toBe("已安装");
    expect(entry(companySkills, "tabCatalog")).toBe("技能库");
    expect(entry(companySkills, "trustScripts")).toBe("包含脚本");
    expect(entry(companySkills, "compatInvalid")).toBe("无效");
  });

  it("translates the issue detail page", () => {
    const issueDetail = group("issueDetail");
    expect(entry(issueDetail, "copiedToClipboard")).toBe("已复制到剪贴板");
    expect(entry(issueDetail, "subtasksTitle")).toBe("子任务");
    expect(entry(issueDetail, "costSummaryTitle")).toBe("成本摘要");
    expect(entry(issueDetail, "taskArchivedFromInbox")).toBe("已从收件箱归档任务");
    expect(entry(issueDetail, "pausedByBoard")).toBe("看板已暂停。");
    expect(entry(issueDetail, "attributionAssignee")).toBe("负责人");
    expect(entry(issueDetail, "composerHintPausedWithAssignee")).toContain("{{assignee}}");
    expect(entry(issueDetail, "routineOriginTitle")).toContain("{{id}}");
    expect(entry(issueDetail, "reissueTitle")).toContain("{{title}}");
    expect(entry(issueDetail, "stopRunUpdateFailedWithMessage")).toContain("{{message}}");
    expect(entry(issueDetail, "workPausedCancelled_one")).toContain("{{count}}");
    expect(entry(issueDetail, "taskCount_other")).toContain("{{count}}");
    expect(entry(nested(issueDetail, "treeControl"), "pauseSubtree")).toBe("暂停子树");
    expect(entry(nested(issueDetail, "treeControl"), "resumeWork")).toBe("恢复工作");
    expect(entry(nested(issueDetail, "changeField"), "assigneeAgentId")).toBe("负责人");
    expect(entry(nested(issueDetail, "changeValue"), "none")).toBe("无");
    expect(entry(nested(issueDetail, "authorizationReason"), "allow_board_actor")).toBe("看板参与者");
    expect(entry(nested(issueDetail, "reviewPolicyValue"), "human_only")).toBe("仅限人工");
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

  it("translates the pipeline settings page", () => {
    const pipelineSettings = group("pipelineSettings");
    expect(entry(pipelineSettings, "sectionAutomation")).toBe("自动化");
    expect(entry(pipelineSettings, "kindReview")).toBe("评审");
    expect(entry(pipelineSettings, "kindWorkingDesc")).toContain("条目");
    expect(entry(pipelineSettings, "breakdownTitle")).toBe("拆分为更小的块");
    expect(entry(pipelineSettings, "chooseStage")).toBe("选择阶段");
    expect(entry(pipelineSettings, "choosePipeline")).toBe("选择流水线");
    expect(entry(pipelineSettings, "deleteStageTitle")).toBe("删除阶段");
    expect(entry(pipelineSettings, "archivePipelineTitle")).toBe("归档流水线");
    expect(entry(pipelineSettings, "warningCount")).toBe("{{count}} 个警告");
    expect(entry(pipelineSettings, "stepIndex")).toContain("{{index}}");
    expect(entry(pipelineSettings, "insertStageAfter")).toContain("{{name}}");
    expect(entry(pipelineSettings, "reusingWorkspaceFrom")).toContain("{{name}}");
    expect(entry(pipelineSettings, "reusingWorkspaceFrom")).toContain("{{source}}");
    expect(entry(pipelineSettings, "agentRunsThisStep")).toContain("{{name}}");
    expect(entry(pipelineSettings, "carryOverIdentityNote")).toContain("{{noun}}");
    expect(entry(pipelineSettings, "waitAllFinishedLabel")).toContain("{{plural}}");
    expect(entry(pipelineSettings, "destinationValidation")).toContain("校验");
    expect(entry(pipelineSettings, "anyHuman")).toBe("任何人工");
    expect(entry(pipelineSettings, "strictEnforceLabel")).toContain("流转");
    expect(entry(pipelineSettings, "summaryCreate")).toContain("{{noun}}");
    expect(entry(pipelineSettings, "summaryJoinSeparator")).toBe("，");
    expect(entry(pipelineSettings, "summaryTerminator")).toBe("。");
    expect(entry(pipelineSettings, "secretsSaveButton")).toBe("保存密钥");
    expect(entry(pipelineSettings, "secretsNoAutomation")).toContain("自动化");
    expect(entry(pipelineSettings, "revisionLabel")).toContain("{{number}}");
    expect(entry(pipelineSettings, "restoredToastTitle")).toContain("{{number}}");

    const companySettings = group("companySettings");
    expect(entry(companySettings, "pluginSelectCompany")).toContain("选择公司");
    expect(entry(companySettings, "pluginExtensionsUnavailable")).toContain("{{message}}");
    expect(entry(companySettings, "pluginRouteConflictPrefix")).toContain("插件");
  });

  it("translates the task chat thread, comment thread, and chat composer", () => {
    const issueChat = group("issueChat");
    expect(entry(issueChat, "authorAgent")).toBe("智能体");
    expect(entry(issueChat, "assigneePausedNotice")).toContain("{{name}}");
    expect(entry(issueChat, "assigneePausedNotice")).toContain("暂停");
    expect(entry(issueChat, "deleteCommentTitle")).toBe("删除评论？");
    expect(entry(issueChat, "deleteCommentDescription")).toContain("已删除标记");
    expect(entry(issueChat, "feedbackHelpful")).toBe("有帮助");
    expect(entry(issueChat, "sharePrefAlwaysAllow")).toBe("始终允许");
    expect(entry(issueChat, "sharePrefChangeLater")).toContain("设置");
    expect(entry(issueChat, "dropToUpload")).toBe("拖放以上传");
    expect(entry(issueChat, "responsibleLabel")).toBe("负责人");
    expect(entry(issueChat, "noResponsibleDialogBody")).toContain("负责人");
    expect(entry(issueChat, "noRunOutputYet")).toBe("暂无运行输出。");
    expect(entry(issueChat, "emptyConversation")).toContain("为空");
    expect(entry(issueChat, "jumpToLatest")).toBe("跳到最新");
    expect(entry(issueChat, "ranCommands_one")).toContain("{{count}}");
    expect(entry(issueChat, "commentButton")).toBe("评论");
    expect(entry(issueChat, "chatComposerPlaceholder")).toBe("消息…");
  });

  it("translates interaction cards and recovery actions", () => {
    const issueChat = group("issueChat");
    expect(entry(issueChat, "kindSuggestTasks")).toBe("建议任务");
    expect(entry(issueChat, "approveAndRun")).toBe("批准并运行");
    expect(entry(issueChat, "applyDecisions")).toContain("{{count}}");
    expect(entry(issueChat, "verdictThisItemAria")).toContain("{{verdict}}");
    expect(entry(issueChat, "titleToolApprovalRequested")).toBe("已请求工具批准");
    expect(entry(issueChat, "confirmationExpiredAuto")).toContain("终态");

    const issueRecovery = group("issueRecovery");
    expect(entry(issueRecovery, "kindStrandedTask")).toBe("搁置任务");
    expect(entry(issueRecovery, "stateInProgress")).toBe("恢复中");
    expect(entry(issueRecovery, "resolveTryAgain")).toBe("重试");
    expect(entry(issueRecovery, "attemptOf")).toContain("{{count}}");
    expect(entry(issueRecovery, "attemptOf")).toContain("{{max}}");
    expect(entry(issueRecovery, "unassignedPickOne")).toContain("未分配");
    expect(entry(issueRecovery, "reissueBody")).toContain("worktree");
    expect(entry(issueRecovery, "retryMissedAt")).toContain("{{offset}}");
  });

  it("translates the execution workspace detail page", () => {
    const executionWorkspace = group("executionWorkspace");
    expect(entry(executionWorkspace, "tabServices")).toBe("服务");
    expect(entry(executionWorkspace, "tabRuntimeLogs")).toBe("运行时日志");
    expect(entry(executionWorkspace, "runNow")).toBe("立即运行");
    expect(entry(executionWorkspace, "jobCompleted")).toBe("工作区任务已完成。");
    expect(entry(executionWorkspace, "runtimeConfigInheriting")).toContain("继承");
    expect(entry(executionWorkspace, "fieldWorkingDir")).toBe("工作目录");
    expect(entry(executionWorkspace, "notScheduled")).toBe("未安排");
    expect(entry(executionWorkspace, "backToTasks")).toBe("返回任务");
    expect(entry(executionWorkspace, "lastRunAt")).toContain("{{time}}");
    expect(entry(executionWorkspace, "runtimeProvisioningFailed")).toBe("预置失败");
    expect(entry(executionWorkspace, "portConflictWarning")).toContain("{{services}}");
    expect(entry(executionWorkspace, "settingsDescription")).toContain("执行工作区");
    expect(entry(executionWorkspace, "noUnsavedChanges")).toBe("没有未保存的更改。");
    expect(entry(executionWorkspace, "loadingOperations")).toContain("加载");
  });

  it("translates the status cards board and detail surfaces", () => {
    const statusCards = group("statusCards");
    expect(entry(statusCards, "breadcrumb")).toBe("状态");
    expect(entry(statusCards, "showArchived")).toContain("{{count}}");
    expect(entry(nested(statusCards, "create"), "promptLabel")).toContain("关注");
    expect(entry(nested(statusCards, "settings"), "autoUpdatePolicy")).toBe("自动更新策略");
    expect(entry(nested(statusCards, "settings"), "minutes")).toContain("{{minutes}}");
    expect(entry(nested(statusCards, "detail"), "revisionLatest")).toContain("{{number}}");
    expect(entry(nested(statusCards, "detail"), "compiledBy")).toContain("{{version}}");
    expect(entry(nested(statusCards, "tile"), "integratingMany")).toContain("{{count}}");
    expect(entry(nested(statusCards, "archived"), "summaryLine")).toContain("{{lastSummary}}");
  });

  it("translates live runs, goal details, and join request queue copy", () => {
    const liveRuns = group("dashboardLive");
    expect(entry(liveRuns, "title")).toBe("智能体实时运行");
    expect(entry(liveRuns, "showingUpTo")).toContain("{{count}}");

    const goalDetail = group("goalDetail");
    expect(entry(goalDetail, "showProperties")).toBe("显示属性");
    expect(entry(goalDetail, "subGoals")).toContain("{{count}}");

    const joinRequests = group("joinRequestQueue");
    expect(entry(joinRequests, "title")).toBe("加入请求队列");
    expect(entry(joinRequests, "inviteSummary")).toContain("{{roleSuffix}}");
    expect(entry(joinRequests, "submitted")).toContain("{{time}}");
  });

  it("translates the audit feed controls and empty states", () => {
    const auditFeed = group("auditFeed");
    expect(entry(auditFeed, "title")).toBe("活动");
    expect(entry(auditFeed, "allActivity")).toBe("全部活动");
    expect(entry(auditFeed, "onBehalfOf")).toContain("{{name}}");
    expect(entry(auditFeed, "filteredEmptyDescription")).toContain("筛选");
  });

  it("translates the agent, routine, workspace, onboarding, and access surfaces", () => {
    const agentConfig = group("agentConfig");
    expect(entry(agentConfig, "adapterType")).toBe("适配器类型");
    expect(entry(nested(agentConfig, "pathInstructions"), "title")).toBe("如何获取完整路径");

    expect(entry(group("routines"), "title")).toBe("例行程序");
    expect(entry(group("projectWorkspace"), "workspaceName")).toBe("工作区名称");
    expect(entry(group("workspaceFiles"), "searchPlaceholder")).toContain("搜索文件");
    expect(entry(group("fileViewer"), "fileNotFoundBody")).toContain("工作区");

    expect(entry(group("onboarding"), "defaultTaskTitle")).toContain("引导");
    expect(entry(group("inviteLanding"), "joinCompany")).toContain("{{company}}");
    expect(entry(group("companyImport"), "processedSummary")).toContain("{{company}}");
    expect(entry(group("companyInvites"), "audienceBothWithRole")).toContain("{{role}}");
    expect(entry(group("adapterManager"), "installedToastBody")).toContain("{{type}}");
    expect(entry(group("orgChart"), "title")).toBe("组织架构图");
  });
});
