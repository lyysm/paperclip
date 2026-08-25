import type { ReactNode } from "react";
import type {
  ToolRiskLevel,
  ToolConnectionHealthStatus,
  ToolPolicyDecision,
} from "@paperclipai/shared";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiError } from "@/api/client";
import { t } from "@/i18n";

/** Risk classification badge for a catalog tool. */
export function RiskBadge({ risk }: { risk: ToolRiskLevel | null | undefined }) {
  if (!risk) return <Badge variant="outline">{t("toolsShared.risk.unknown", { defaultValue: "unknown" })}</Badge>;
  const variant =
    risk === "high" || risk === "critical"
      ? "destructive"
      : risk === "medium"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{t(`toolsShared.risk.${risk}`, { defaultValue: risk })}</Badge>;
}

/** Read/Write/Destructive capability chips. */
export function CapabilityBadges({
  isReadOnly,
  isWrite,
  isDestructive,
}: {
  isReadOnly?: boolean;
  isWrite?: boolean;
  isDestructive?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {isReadOnly ? <Badge variant="outline">{t("toolsShared.capability.readOnly", { defaultValue: "read-only" })}</Badge> : null}
      {isWrite ? <Badge variant="secondary">{t("toolsShared.capability.write", { defaultValue: "write" })}</Badge> : null}
      {isDestructive ? <Badge variant="destructive">{t("toolsShared.capability.destructive", { defaultValue: "destructive" })}</Badge> : null}
    </span>
  );
}

/** Catalog quarantine marker — canonical status key. */
export function QuarantineBadge() {
  return <StatusBadge status="quarantined" />;
}

function healthToStatusKey(status: string): string {
  switch (status) {
    case "healthy":
    case "ok":
    case "":
      return "healthy";
    case "degraded":
    case "warning":
      return "degraded";
    case "error":
    case "unhealthy":
    case "critical":
      return "runtime-error";
    case "unchecked":
    case "unknown":
      return "unchecked";
    default:
      return status;
  }
}

/** Connection / runtime health badge, mapped onto canonical status colors. */
export function HealthBadge({
  status,
  label,
}: {
  status: ToolConnectionHealthStatus | string | null | undefined;
  label?: string;
}) {
  const raw = (status ?? "unknown").toString();
  return <StatusBadge status={healthToStatusKey(raw)} label={label ?? raw} />;
}

function decisionToStatusKey(decision: string): { key: string; label: string } {
  switch (decision) {
    case "allow":
    case "allowed":
      return { key: "allowed", label: t("toolsShared.decision.allowed", { defaultValue: "allowed" }) };
    case "deny":
    case "denied":
      return { key: "denied", label: t("toolsShared.decision.denied", { defaultValue: "denied" }) };
    case "block":
      return { key: "block", label: t("toolsShared.decision.block", { defaultValue: "block" }) };
    case "require_approval":
    case "requires_approval":
      return { key: "require-approval", label: t("toolsShared.decision.requireApproval", { defaultValue: "require approval" }) };
    case "redact":
    case "redacted":
      return { key: "redacted", label: t("toolsShared.decision.redacted", { defaultValue: "redacted" }) };
    case "rate_limited":
      return { key: "rate-limit", label: t("toolsShared.decision.rateLimited", { defaultValue: "rate limited" }) };
    case "defer":
    case "deferred":
      return { key: "deferred", label: t("toolsShared.decision.deferred", { defaultValue: "deferred" }) };
    case "hidden":
      return { key: "hidden", label: t("toolsShared.decision.hidden", { defaultValue: "hidden" }) };
    default:
      return { key: decision, label: decision };
  }
}

/** Policy/gateway decision badge — canonical status colors. */
export function DecisionBadge({ decision }: { decision: ToolPolicyDecision | string | null | undefined }) {
  if (!decision) return <Badge variant="outline">—</Badge>;
  const { key, label } = decisionToStatusKey(decision.toString());
  return <StatusBadge status={key} label={label} />;
}

/** Compact relative time, falling back to absolute. */
export function RelativeTime({ value }: { value: Date | string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">{t("toolsShared.relativeTime.never", { defaultValue: "never" })}</span>;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return <span className="text-muted-foreground">—</span>;
  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const isFuture = diffMs < 0;
  let text: string;
  if (mins < 1) text = t("toolsShared.relativeTime.justNow", { defaultValue: "just now" });
  else {
    const amount = mins < 60 ? mins : mins < 1440 ? Math.round(mins / 60) : Math.round(mins / 1440);
    const unit = mins < 60 ? "m" : mins < 1440 ? "h" : "d";
    text = isFuture
      ? t("toolsShared.relativeTime.in", { defaultValue: "in {{amount}}{{unit}}", amount, unit })
      : t("toolsShared.relativeTime.ago", { defaultValue: "{{amount}}{{unit}} ago", amount, unit });
  }
  return (
    <span title={date.toLocaleString()} className="text-muted-foreground">
      {text}
    </span>
  );
}

export function ToolsPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingState({ label = t("toolsShared.loading", { defaultValue: "Loading…" }) }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      {label}
    </div>
  );
}

/** Actionable error surface — surfaces the server message and HTTP status. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  let message: string;
  if (error instanceof ApiError) {
    if (error.status === 403) {
      message = t("toolsShared.errors.forbidden", { defaultValue: "You do not have permission to view this. Tools & Access requires board/admin access." });
    } else if (error.status === 404 || /route not found/i.test(error.message)) {
      // Snapshot-skew window: the route exists in this build but not on the live server snapshot yet.
      message = t("toolsShared.errors.notAvailable", { defaultValue: "Tools & Access isn't available on this server yet — try refreshing after the next deployment." });
    } else {
      message = error.message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = t("toolsShared.errors.generic", { defaultValue: "Something went wrong." });
  }
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col gap-3 py-6">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{t("toolsShared.errors.loadFailed", { defaultValue: "Could not load this view" })}</p>
            <p className="text-destructive/80">{message}</p>
          </div>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            {t("toolsShared.retry", { defaultValue: "Retry" })}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Honest notice for surfaces whose backend contract has not shipped yet.
 * This must NOT pretend to enforce anything client-side — it links the
 * follow-up issue that owns the missing contract.
 */
export function PendingBackendNotice({
  title,
  body,
  issue,
}: {
  title: string;
  body: ReactNode;
  issue?: { identifier: string; href: string };
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-2 py-8">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {title}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{body}</p>
        {issue ? (
          <a href={issue.href} className="text-sm font-medium text-primary hover:underline">
            {t("toolsShared.trackedIn", { defaultValue: "Tracked in {{identifier}} →", identifier: issue.identifier })}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
