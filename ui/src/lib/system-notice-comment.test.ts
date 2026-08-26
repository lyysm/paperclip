// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { buildSystemNoticeProps, mapCommentMetadataToSystemNoticeSections } from "./system-notice-comment";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("mapCommentMetadataToSystemNoticeSections", () => {
  it("maps server metadata row types to SystemNotice rows", () => {
    const sections = mapCommentMetadataToSystemNoticeSections(
      {
        version: 1,
        sections: [
          {
            title: "Required action",
            rows: [
              { type: "issue_link", label: "Source issue", issueId: "i1", identifier: "PAP-3440", title: "Recovery" },
              { type: "agent_link", label: "Responsible", agentId: "agent-1", name: "CodexCoder" },
              { type: "key_value", label: "Status before", value: "in_progress" },
              { type: "code", label: "Cause code", code: "missing_disposition" },
              { type: "text", label: "Notes", text: "Pick a disposition." },
              { type: "run_link", label: "Source run", runId: "9cdba892-c7ca-4d93-8604-4843873b127c", title: "succeeded" },
            ],
          },
        ],
      },
      { runAgentId: "agent-1" },
    );

    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBe("Required action");

    const rows = sections[0]!.rows;
    expect(rows).toEqual([
      {
        kind: "issue",
        label: "Source issue",
        identifier: "PAP-3440",
        href: "/issues/PAP-3440",
        title: "Recovery",
      },
      { kind: "agent", label: "Responsible", name: "CodexCoder", href: "/agents/agent-1" },
      { kind: "text", label: "Status before", value: "in_progress" },
      { kind: "code", label: "Cause code", value: "missing_disposition" },
      { kind: "text", label: "Notes", value: "Pick a disposition." },
      {
        kind: "run",
        label: "Source run",
        runId: "9cdba892-c7ca-4d93-8604-4843873b127c",
        href: "/agents/agent-1/runs/9cdba892-c7ca-4d93-8604-4843873b127c",
        status: "succeeded",
      },
    ]);
  });

  it("omits run href when no runAgentId is available", () => {
    const sections = mapCommentMetadataToSystemNoticeSections(
      {
        version: 1,
        sections: [
          {
            rows: [
              { type: "run_link", label: "Run", runId: "abc12345" },
            ],
          },
        ],
      },
      {},
    );

    expect(sections[0]?.rows[0]).toEqual({
      kind: "run",
      label: "Run",
      runId: "abc12345",
      href: undefined,
      status: undefined,
    });
  });

  it("returns an empty array for null metadata", () => {
    expect(mapCommentMetadataToSystemNoticeSections(null)).toEqual([]);
    expect(mapCommentMetadataToSystemNoticeSections(undefined)).toEqual([]);
  });

  it("translates the successful-run handoff card while preserving machine values", async () => {
    await i18n.changeLanguage("zh-CN");

    const metadata = {
      version: 1 as const,
      sections: [
        {
          title: "Required action",
          rows: [
            { type: "issue_link" as const, label: "Source issue", issueId: "i1", identifier: "PAP-3440", title: "Recovery" },
            { type: "agent_link" as const, label: "Assignee", agentId: "agent-1", name: "ly" },
            { type: "key_value" as const, label: "Missing disposition", value: "clear_next_step" },
            {
              type: "key_value" as const,
              label: "Valid dispositions",
              value: "done, cancelled, in_review with an owner, blocked with blockers, delegated follow-up, or explicit continuation",
            },
          ],
        },
        {
          title: "Run evidence",
          rows: [
            { type: "run_link" as const, label: "Successful run", runId: "681d0938-0000-4000-8000-000000000000", title: "succeeded" },
            { type: "key_value" as const, label: "Run status", value: "succeeded" },
            { type: "key_value" as const, label: "Normalized cause", value: "successful_run_missing_state" },
            {
              type: "key_value" as const,
              label: "Detected progress",
              value: "Run produced concrete action evidence: 2 issue comment(s), 2 workspace operation(s), 3 activity event(s), 13 tool/action event(s)",
            },
            { type: "key_value" as const, label: "Automatic retry", value: "one corrective handoff wake queued" },
          ],
        },
      ],
    };

    const sections = mapCommentMetadataToSystemNoticeSections(metadata);
    expect(sections[0]?.title).toBe("必要操作");
    expect(sections[0]?.rows.map((row) => row.label)).toEqual([
      "源任务",
      "负责人",
      "缺少处置",
      "有效处置方式",
    ]);
    expect(sections[0]?.rows[2]).toMatchObject({ value: "clear_next_step" });
    expect(sections[1]?.title).toBe("运行证据");
    expect(sections[1]?.rows[0]).toMatchObject({ label: "成功运行", status: "已成功" });
    expect(sections[1]?.rows[1]).toMatchObject({ label: "运行状态", value: "已成功" });
    expect(sections[1]?.rows[2]).toMatchObject({ value: "successful_run_missing_state" });
    expect(sections[1]?.rows[3]).toMatchObject({
      label: "检测到的进展",
      value: "运行产生了具体操作证据：2 条任务评论、2 次工作区操作、3 个活动事件、13 个工具/操作事件",
    });
    expect(sections[1]?.rows[4]).toMatchObject({
      label: "自动重试",
      value: "已排队一次纠正性交接唤醒",
    });

    const props = buildSystemNoticeProps({
      presentation: {
        kind: "system_notice",
        tone: "warning",
        title: "Missing issue disposition",
        detailsDefaultOpen: true,
      },
      metadata,
      body: "server body",
      bodyText: "Paperclip needs a disposition before this issue can continue.",
    });
    expect(props.label).toBe("缺少任务处置");
    expect(props.body).toBe("Paperclip 需要先为此任务选择处置方式，才能继续。");
  });
});

describe("buildSystemNoticeProps", () => {
  it("derives tone, label, and metadata from a system_notice presentation", () => {
    const props = buildSystemNoticeProps({
      presentation: {
        kind: "system_notice",
        tone: "warning",
        title: "Missing disposition",
        detailsDefaultOpen: false,
      },
      metadata: {
        version: 1,
        sections: [
          {
            title: "Required",
            rows: [{ type: "key_value", label: "Status", value: "in_progress" }],
          },
        ],
      },
      body: "Body text",
      runAgentId: "agent-1",
    });

    expect(props.tone).toBe("warning");
    expect(props.label).toBe("Missing disposition");
    expect(props.detailsDefaultOpen).toBe(false);
    expect(props.metadata?.[0]?.rows[0]).toEqual({
      kind: "text",
      label: "Status",
      value: "in_progress",
    });
  });

  it("falls back to neutral tone with default label when presentation is null", () => {
    const props = buildSystemNoticeProps({
      presentation: null,
      metadata: null,
      body: "Hello",
    });

    expect(props.tone).toBe("neutral");
    expect(props.label).toBe("System notice");
    expect(props.metadata).toBeUndefined();
  });

  it("uses the danger default label when presentation lacks a title", () => {
    const props = buildSystemNoticeProps({
      presentation: {
        kind: "system_notice",
        tone: "danger",
        title: null,
        detailsDefaultOpen: true,
      },
      metadata: null,
      body: "boom",
    });

    expect(props.label).toBe("System alert");
    expect(props.detailsDefaultOpen).toBe(true);
  });
});
