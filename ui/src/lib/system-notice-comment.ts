import type {
  IssueCommentMetadata,
  IssueCommentMetadataRow,
  IssueCommentPresentation,
} from "@paperclipai/shared";
import { t } from "@/i18n";
import type {
  SystemNoticeMetadataRow,
  SystemNoticeMetadataSection,
  SystemNoticeProps,
  SystemNoticeTone,
} from "../components/SystemNotice";
import { SUCCESSFUL_RUN_HANDOFF_REQUIRED_NOTICE_BODY } from "./successful-run-handoff";

const TONE_LABEL: Record<SystemNoticeTone, string> = {
  neutral: "System notice",
  info: "System notice",
  success: "System notice",
  warning: "System warning",
  danger: "System alert",
};

const TONE_LABEL_KEY: Record<SystemNoticeTone, string> = {
  neutral: "systemNotice.notice",
  info: "systemNotice.notice",
  success: "systemNotice.notice",
  warning: "systemNotice.warning",
  danger: "systemNotice.alert",
};

const METADATA_LABEL_KEYS: Record<string, string> = {
  "Required action": "systemNotice.successfulRunHandoff.requiredAction",
  "Source issue": "systemNotice.successfulRunHandoff.sourceIssue",
  Assignee: "systemNotice.successfulRunHandoff.assignee",
  "Missing disposition": "systemNotice.successfulRunHandoff.missingDisposition",
  "Valid dispositions": "systemNotice.successfulRunHandoff.validDispositions",
  "Run evidence": "systemNotice.successfulRunHandoff.runEvidence",
  "Successful run": "systemNotice.successfulRunHandoff.successfulRun",
  "Run status": "systemNotice.successfulRunHandoff.runStatus",
  "Normalized cause": "systemNotice.successfulRunHandoff.normalizedCause",
  "Detected progress": "systemNotice.successfulRunHandoff.detectedProgress",
  "Automatic retry": "systemNotice.successfulRunHandoff.automaticRetry",
};

const VALID_DISPOSITIONS_VALUE =
  "done, cancelled, in_review with an owner, blocked with blockers, delegated follow-up, or explicit continuation";
const AUTOMATIC_RETRY_VALUE = "one corrective handoff wake queued";
const DETECTED_PROGRESS_PATTERN =
  /^Run produced concrete action evidence: (\d+) issue comment\(s\), (\d+) workspace operation\(s\), (\d+) activity event\(s\), (\d+) tool\/action event\(s\)$/;

function localizeSystemNoticeLabel(label: string) {
  if (label === "Missing issue disposition") {
    return t("systemNotice.successfulRunHandoff.title", { defaultValue: label });
  }
  return label;
}

function localizeMetadataLabel(label: string) {
  const key = METADATA_LABEL_KEYS[label];
  return key ? t(key, { defaultValue: label }) : label;
}

function metadataRowText(
  row: { label?: string | null },
  fallbackKey: string,
  fallback: string,
) {
  const label = row.label?.trim();
  return localizeMetadataLabel(
    label && label.length > 0 ? label : t(fallbackKey, { defaultValue: fallback }),
  );
}

function localizeRunStatus(status: string) {
  return t(`statuses.generic.${status}`, { defaultValue: status });
}

function localizeDetectedProgress(value: string) {
  const match = value.match(DETECTED_PROGRESS_PATTERN);
  if (!match) return value;
  return t("systemNotice.successfulRunHandoff.detectedProgressValue", {
    defaultValue:
      "Run produced concrete action evidence: {{issueComments}} issue comment(s), {{workspaceOperations}} workspace operation(s), {{activityEvents}} activity event(s), {{toolActionEvents}} tool/action event(s)",
    issueComments: match[1],
    workspaceOperations: match[2],
    activityEvents: match[3],
    toolActionEvents: match[4],
  });
}

function localizeMetadataValue(label: string | null | undefined, value: string) {
  if (label === "Valid dispositions" && value === VALID_DISPOSITIONS_VALUE) {
    return t("systemNotice.successfulRunHandoff.validDispositionsValue", { defaultValue: value });
  }
  if (label === "Automatic retry" && value === AUTOMATIC_RETRY_VALUE) {
    return t("systemNotice.successfulRunHandoff.automaticRetryValue", { defaultValue: value });
  }
  if (label === "Detected progress") return localizeDetectedProgress(value);
  if (label === "Run status") return localizeRunStatus(value);
  return value;
}

export function localizeSystemNoticeBody(body: string) {
  if (body.trim() !== SUCCESSFUL_RUN_HANDOFF_REQUIRED_NOTICE_BODY) return null;
  return t("systemNotice.successfulRunHandoff.body", { defaultValue: body });
}

function mapMetadataRow(
  row: IssueCommentMetadataRow,
  ctx: { runAgentId?: string | null },
): SystemNoticeMetadataRow | null {
  switch (row.type) {
    case "text":
      return {
        kind: "text",
        label: metadataRowText(row, "systemNotice.metadata.detail", "Detail"),
        value: row.text,
      };
    case "code":
      return {
        kind: "code",
        label: metadataRowText(row, "systemNotice.metadata.code", "Code"),
        value: row.code,
      };
    case "key_value":
      return {
        kind: "text",
        label: localizeMetadataLabel(row.label),
        value: localizeMetadataValue(row.label, row.value),
      };
    case "issue_link": {
      const identifier = row.identifier ?? null;
      if (!identifier) {
        return {
          kind: "text",
          label: metadataRowText(row, "systemNotice.metadata.task", "Task"),
          value: row.title ?? "unknown",
        };
      }
      return {
        kind: "issue",
        label: metadataRowText(row, "systemNotice.metadata.task", "Task"),
        identifier,
        href: `/issues/${identifier}`,
        title: row.title ?? undefined,
      };
    }
    case "agent_link": {
      const name = row.name?.trim() || row.agentId.slice(0, 8);
      return {
        kind: "agent",
        label: metadataRowText(row, "systemNotice.metadata.agent", "Agent"),
        name,
        href: `/agents/${row.agentId}`,
      };
    }
    case "run_link": {
      const runAgentId = row.agentId ?? ctx.runAgentId ?? null;
      const href = runAgentId ? `/agents/${runAgentId}/runs/${row.runId}` : undefined;
      return {
        kind: "run",
        label: metadataRowText(row, "systemNotice.metadata.run", "Run"),
        runId: row.runId,
        href,
        status: row.title ? localizeRunStatus(row.title) : undefined,
      };
    }
    default:
      return null;
  }
}

export function mapCommentMetadataToSystemNoticeSections(
  metadata: IssueCommentMetadata | null | undefined,
  ctx: { runAgentId?: string | null } = {},
): SystemNoticeMetadataSection[] {
  if (!metadata || !Array.isArray(metadata.sections)) return [];
  return metadata.sections
    .map((section) => {
      const rows = section.rows
        .map((row) => mapMetadataRow(row, ctx))
        .filter((r): r is SystemNoticeMetadataRow => r !== null);
      if (rows.length === 0) return null;
      const out: SystemNoticeMetadataSection = { rows };
      if (section.title) out.title = localizeMetadataLabel(section.title);
      return out;
    })
    .filter((s): s is SystemNoticeMetadataSection => s !== null);
}

export function systemNoticeLabelForTone(
  tone: SystemNoticeTone,
  presentationTitle?: string | null,
): string {
  const trimmed = presentationTitle?.trim();
  if (trimmed && trimmed.length > 0) return localizeSystemNoticeLabel(trimmed);
  return t(TONE_LABEL_KEY[tone], { defaultValue: TONE_LABEL[tone] });
}

export function buildSystemNoticeProps(input: {
  presentation: IssueCommentPresentation | null;
  metadata: IssueCommentMetadata | null;
  body: import("react").ReactNode;
  bodyText?: string;
  timestamp?: string;
  source?: SystemNoticeProps["source"];
  runAgentId?: string | null;
}): SystemNoticeProps {
  const tone: SystemNoticeTone = input.presentation?.tone ?? "neutral";
  const label = systemNoticeLabelForTone(tone, input.presentation?.title);
  const detailsDefaultOpen = Boolean(input.presentation?.detailsDefaultOpen);
  const sections = mapCommentMetadataToSystemNoticeSections(input.metadata, {
    runAgentId: input.runAgentId ?? null,
  });
  const localizedBody = input.bodyText ? localizeSystemNoticeBody(input.bodyText) : null;
  return {
    tone,
    label,
    body: localizedBody ?? input.body,
    metadata: sections.length > 0 ? sections : undefined,
    detailsDefaultOpen,
    timestamp: input.timestamp,
    source: input.source,
  };
}
