/**
 * Minimal structural type satisfied by both the `useTranslation()` hook `t`
 * and the standalone `t` export from `@/i18n`, so label resolvers work in
 * components and in non-React call sites alike.
 */
export type StatusTranslate = {
  (key: string, options?: { defaultValue?: string; [option: string]: unknown }): string;
};

/** "in_review" → "In review" — the untranslated display fallback for issue/task statuses. */
export function sentenceCaseStatus(status: string): string {
  const s = status.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "auth_required" → "auth required" — the untranslated display fallback for generic statuses. */
export function humanizeStatus(status: string): string {
  return status.replace(/[_-]/g, " ");
}

/**
 * Generic status chip label (runs / goals / approvals / projects / …).
 * Unknown values keep the legacy lowercase-humanized English via `defaultValue`.
 */
export function genericStatusLabel(t: StatusTranslate, status: string): string {
  return t(`statuses.generic.${status}`, { defaultValue: humanizeStatus(status) });
}

/** Issue/task status label, sentence-cased in English. */
export function issueStatusLabel(t: StatusTranslate, status: string): string {
  return t(`statuses.issue.${status}`, { defaultValue: sentenceCaseStatus(status) });
}

/**
 * Agent status label. `active` keeps rendering as its "idle" alias, matching
 * the pre-i18n behavior of `AgentStatusBadge`.
 */
export function agentStatusLabel(t: StatusTranslate, status: string): string {
  const value = status === "active" ? "idle" : status;
  return t(`statuses.agent.${value}`, { defaultValue: humanizeStatus(value) });
}

/** Task priority label (Critical / High / Medium / Low). */
export function priorityLabel(t: StatusTranslate, priority: string): string {
  return t(`statuses.priority.${priority}`, { defaultValue: sentenceCaseStatus(priority) });
}
