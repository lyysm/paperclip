import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, FlaskConical, Lock, Play, Search } from "lucide-react";
import type {
  InstanceExperimentalSettings,
  InstanceExperimentalSettingsWithManaged,
  InstanceFeatureKey,
  IssueGraphLivenessAutoRecoveryPreview,
  ManagedSettingMetadata,
  PatchInstanceExperimentalSettings,
} from "@paperclipai/shared";
import { experimentalSettingKey } from "@paperclipai/shared";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useTranslation } from "@/i18n";
import { useHiddenSettings } from "@/hooks/useHiddenSettings";
import { getWorktreeInstanceId, isWorktreeRuntime } from "../lib/worktree-branding";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function issueHref(identifier: string | null, issueId: string) {
  if (!identifier) return `/issues/${issueId}`;
  const prefix = identifier.split("-")[0] || "PAP";
  return `/${prefix}/issues/${identifier}`;
}

function formatRecoveryState(state: string) {
  return state.replace(/_/g, " ");
}

type WorktreeRunExecutionDisplayState =
  | { kind: "off" }
  | { kind: "armed"; activatedAt: string }
  | { kind: "fail_closed"; reason: "missing_cutoff" | "missing_instance_id" | "instance_mismatch" };

/**
 * Mirror of the server's `resolveWorktreeRunExecutionActivation` fail-closed
 * ladder (server/src/services/instance-settings.ts) so the card never claims a
 * copied/legacy row is arming execution. The derived fields are display-only —
 * the PATCH the toggle sends still writes just the boolean.
 */
function resolveWorktreeRunExecutionDisplayState(
  settings:
    | Pick<
        InstanceExperimentalSettings,
        | "enableWorktreeRunExecution"
        | "worktreeRunExecutionActivatedAt"
        | "worktreeRunExecutionActivationInstanceId"
      >
    | undefined,
  currentInstanceId: string | null,
): WorktreeRunExecutionDisplayState {
  if (settings?.enableWorktreeRunExecution !== true) return { kind: "off" };
  if (!settings.worktreeRunExecutionActivatedAt) return { kind: "fail_closed", reason: "missing_cutoff" };
  if (!currentInstanceId) return { kind: "fail_closed", reason: "missing_instance_id" };
  if (settings.worktreeRunExecutionActivationInstanceId !== currentInstanceId) {
    return { kind: "fail_closed", reason: "instance_mismatch" };
  }
  return { kind: "armed", activatedAt: settings.worktreeRunExecutionActivatedAt };
}

function formatActivationTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// PAP-11233: keep Conference Room code intact, but hide the user-facing opt-in for now.
const SHOW_CONFERENCE_ROOM_EXPERIMENTAL_SETTING = false;

function ManagedByCloudBadge() {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <Lock aria-hidden="true" />
      {t("instanceExperimental.managedByCloud", { defaultValue: "Managed by Paperclip Cloud" })}
    </Badge>
  );
}

function ExperimentalToggleCard({
  title,
  description,
  footnote,
  checked,
  onCheckedChange,
  disabled,
  settingKey,
  managed,
  ariaLabel,
}: {
  title: string;
  description: string;
  footnote?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
  /** Flag key backing this card; operator-hidden keys render nothing. */
  settingKey: InstanceFeatureKey;
  managed?: ManagedSettingMetadata;
  ariaLabel: string;
}) {
  const { hidden: hiddenSettings } = useHiddenSettings();
  const isManaged = managed?.managed === true;
  if (hiddenSettings.has(experimentalSettingKey(settingKey))) return null;
  return (
    <Card className="block p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            {isManaged ? <ManagedByCloudBadge /> : null}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          {footnote ? <p className="max-w-2xl text-xs text-muted-foreground">{footnote}</p> : null}
        </div>
        <ToggleSwitch
          checked={checked}
          onCheckedChange={(next) => {
            if (isManaged) return;
            onCheckedChange(next);
          }}
          disabled={disabled || isManaged}
          aria-label={ariaLabel}
        />
      </div>
    </Card>
  );
}

function RecoveryPreviewDialog({
  preview,
  open,
  onOpenChange,
  onEnableOnly,
  onEnableAndRun,
  isPending,
}: {
  preview: IssueGraphLivenessAutoRecoveryPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnableOnly: () => void;
  onEnableAndRun: () => void;
  isPending: boolean;
}) {
  const count = preview?.recoverableFindings ?? 0;
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t("instanceExperimental.dialog.confirmTitle", { defaultValue: "Confirm auto-recovery" })}
          </DialogTitle>
          <DialogDescription>
            {preview
              ? t("instanceExperimental.dialog.description", {
                  defaultValue: "{{count}} recovery tasks match the last {{hours}} hours.",
                  count,
                  hours: preview.lookbackHours
                })
              : t("instanceExperimental.dialog.checking", {
                  defaultValue: "Checking recovery candidates before enabling."
                })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-(--sz-calc-36) space-y-3 overflow-y-auto pr-1">
          {preview && preview.items.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              {t("instanceExperimental.dialog.emptyPreview", {
                defaultValue:
                  "No recovery tasks would be created right now. Auto-recovery can still run for future liveness incidents in this window."
              })}
            </div>
          ) : null}

          {preview?.items.map((item) => (
            <Card key={item.incidentKey} className="block px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={issueHref(item.identifier, item.issueId)}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {item.identifier ?? item.issueId}
                </a>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {formatRecoveryState(item.state)}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("instanceExperimental.dialog.recoveryTarget", { defaultValue: "Recovery target: " })}
                <a
                  href={issueHref(item.recoveryIdentifier, item.recoveryIssueId)}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {item.recoveryIdentifier ?? item.recoveryIssueId}
                </a>
              </div>
            </Card>
          ))}
        </div>

        {preview && preview.skippedOutsideLookback > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("instanceExperimental.dialog.outsideLookback", {
              defaultValue:
                "{{count}} current findings are outside the configured lookback and will not be touched.",
              count: preview.skippedOutsideLookback
            })}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("instanceExperimental.dialog.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button variant="outline" onClick={onEnableOnly} disabled={isPending || !preview}>
            {t("instanceExperimental.dialog.enableOnly", { defaultValue: "Enable only" })}
          </Button>
          <Button onClick={onEnableAndRun} disabled={isPending || !preview}>
            {count > 0
              ? t("instanceExperimental.dialog.enableAndCreate", {
                  defaultValue: "Enable and create {{count}}",
                  count
                })
              : t("instanceExperimental.dialog.enable", { defaultValue: "Enable" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InstanceExperimentalSettings() {
  const { t } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [lookbackHoursDraft, setLookbackHoursDraft] = useState("24");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<IssueGraphLivenessAutoRecoveryPreview | null>(null);

  function closeRecoveryPreview() {
    setPreviewDialogOpen(false);
    setPendingPreview(null);
  }

  useEffect(() => {
    setBreadcrumbs([
      { label: t("nav.settings", { defaultValue: "Settings" }), href: "/company/settings" },
      { label: t("instanceExperimental.breadcrumb", { defaultValue: "Experimental" }) },
    ]);
  }, [setBreadcrumbs, t]);

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  const toggleMutation = useMutation<
    InstanceExperimentalSettingsWithManaged,
    Error,
    PatchInstanceExperimentalSettings,
    { previousSettings?: InstanceExperimentalSettingsWithManaged }
  >({
    mutationFn: async (patch: PatchInstanceExperimentalSettings) =>
      instanceSettingsApi.updateExperimental(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.instance.experimentalSettings });
      const previousSettings = queryClient.getQueryData<InstanceExperimentalSettingsWithManaged>(
        queryKeys.instance.experimentalSettings,
      );
      if (previousSettings) {
        queryClient.setQueryData<InstanceExperimentalSettingsWithManaged>(
          queryKeys.instance.experimentalSettings,
          { ...previousSettings, ...patch },
        );
      }
      return { previousSettings };
    },
    onSuccess: async (updatedSettings) => {
      setActionError(null);
      queryClient.setQueryData(queryKeys.instance.experimentalSettings, updatedSettings);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: ["built-in-agents"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      ]);
    },
    onError: (error, _patch, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.instance.experimentalSettings, context.previousSettings);
      }
      setActionError(error instanceof Error ? error.message : t("instanceExperimental.updateFailed", { defaultValue: "Failed to update experimental settings." }));
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (lookbackHours: number) =>
      instanceSettingsApi.previewIssueGraphLivenessAutoRecovery({ lookbackHours }),
    onSuccess: (preview) => {
      setActionError(null);
      setPendingPreview(preview);
      setPreviewDialogOpen(true);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceExperimental.previewFailed", { defaultValue: "Failed to preview recovery tasks." }));
    },
  });

  const runRecoveryMutation = useMutation({
    mutationFn: async (lookbackHours: number) =>
      instanceSettingsApi.runIssueGraphLivenessAutoRecovery({ lookbackHours }),
    onSuccess: async () => {
      setActionError(null);
      closeRecoveryPreview();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceExperimental.createRecoveryFailed", { defaultValue: "Failed to create recovery tasks." }));
    },
  });

  useEffect(() => {
    const next = experimentalQuery.data?.issueGraphLivenessAutoRecoveryLookbackHours;
    if (typeof next === "number") {
      setLookbackHoursDraft(String(next));
    }
  }, [experimentalQuery.data?.issueGraphLivenessAutoRecoveryLookbackHours]);

  const autoRecoveryManaged =
    experimentalQuery.data?.managedKeys?.enableIssueGraphLivenessAutoRecovery?.managed === true;

  // If refreshed settings mark auto-recovery as managed while the preview
  // dialog is open, close it so its confirmation actions cannot emit a PATCH.
  useEffect(() => {
    if (autoRecoveryManaged) {
      closeRecoveryPreview();
    }
  }, [autoRecoveryManaged]);

  if (experimentalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("instanceExperimental.loading", { defaultValue: "Loading experimental settings…" })}</div>;
  }

  if (experimentalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {experimentalQuery.error instanceof Error
          ? experimentalQuery.error.message
          : t("instanceExperimental.loadFailed", { defaultValue: "Failed to load experimental settings." })}
      </div>
    );
  }

  const inWorktree = isWorktreeRuntime();
  // Present only on cloud-managed instances: keys the managed overlay controls
  // render locked with the "Managed by Paperclip Cloud" badge. Self-hosted
  // responses carry no `managedKeys`, so every card stays editable.
  const managedKeys = experimentalQuery.data?.managedKeys ?? {};
  const enableWorktreeRunExecution = experimentalQuery.data?.enableWorktreeRunExecution === true;
  const worktreeRunExecutionManaged = managedKeys.enableWorktreeRunExecution?.managed === true;
  const worktreeRunExecutionState = resolveWorktreeRunExecutionDisplayState(
    experimentalQuery.data,
    getWorktreeInstanceId(),
  );
  const enableEnvironments = experimentalQuery.data?.enableEnvironments === true;
  const enableManagedSandboxOnly = experimentalQuery.data?.enableManagedSandboxOnly === true;
  const enableIsolatedWorkspaces = experimentalQuery.data?.enableIsolatedWorkspaces === true;
  const enableApps = experimentalQuery.data?.enableApps === true;
  // Streamlined left navigation is now the standard sidebar (PAP-12472); the
  // experimental opt-out was retired, so it no longer surfaces a toggle here.
  const enableConferenceRoomChat = experimentalQuery.data?.enableConferenceRoomChat === true;
  const enableClassicTaskInterface = experimentalQuery.data?.enableClassicTaskInterface === true;
  const enableIssuePlanDecompositions =
    experimentalQuery.data?.enableIssuePlanDecompositions === true;
  const enableExperimentalFileViewer =
    experimentalQuery.data?.enableExperimentalFileViewer === true;
  const enableTaskWatchdogs = experimentalQuery.data?.enableTaskWatchdogs === true;
  const enableExternalObjects = experimentalQuery.data?.enableExternalObjects === true;
  const enableBuiltInAgents = experimentalQuery.data?.enableBuiltInAgents === true;
  const enableBetaSkills = experimentalQuery.data?.enableBetaSkills === true;
  const enableSummaries = experimentalQuery.data?.enableSummaries === true;
  const enableStatusCards = experimentalQuery.data?.enableStatusCards === true;
  const summariesManaged = managedKeys.enableSummaries?.managed === true;
  const statusCardsManaged = managedKeys.enableStatusCards?.managed === true;
  const statusCardsBlockedByManagedSummaries = summariesManaged && !enableSummaries;
  const summariesRequiredByManagedStatusCards = statusCardsManaged && enableStatusCards;
  const enableDecisions = experimentalQuery.data?.enableDecisions === true;
  const enableGoalsSidebarLink = experimentalQuery.data?.enableGoalsSidebarLink === true;
  const enableCases = experimentalQuery.data?.enableCases === true;
  const enableServerInfoDebugView = experimentalQuery.data?.enableServerInfoDebugView === true;
  const enableSimplifiedEnglishInteractions =
    experimentalQuery.data?.enableSimplifiedEnglishInteractions === true;
  const enableSmokeLab = experimentalQuery.data?.enableSmokeLab === true;
  const autoRestartDevServerWhenIdle = experimentalQuery.data?.autoRestartDevServerWhenIdle === true;
  const enableIssueGraphLivenessAutoRecovery =
    experimentalQuery.data?.enableIssueGraphLivenessAutoRecovery === true;
  const lookbackHours =
    experimentalQuery.data?.issueGraphLivenessAutoRecoveryLookbackHours ?? 24;
  const parsedLookbackHours = Number.parseInt(lookbackHoursDraft, 10);
  const lookbackHoursIsValid =
    Number.isInteger(parsedLookbackHours) && parsedLookbackHours >= 1 && parsedLookbackHours <= 720;
  const recoveryActionPending =
    toggleMutation.isPending || previewMutation.isPending || runRecoveryMutation.isPending;

  function previewForEnable() {
    if (autoRecoveryManaged) return;
    if (!lookbackHoursIsValid) {
      setActionError(t("instanceExperimental.lookbackInvalid", { defaultValue: "Lookback hours must be a whole number from 1 to 720." }));
      return;
    }
    closeRecoveryPreview();
    previewMutation.mutate(parsedLookbackHours);
  }

  function enableOnly() {
    if (autoRecoveryManaged) return;
    if (!lookbackHoursIsValid) return;
    closeRecoveryPreview();
    toggleMutation.mutate({
      enableIssueGraphLivenessAutoRecovery: true,
      issueGraphLivenessAutoRecoveryLookbackHours: parsedLookbackHours,
    });
  }

  function enableAndRun() {
    if (autoRecoveryManaged) return;
    if (!lookbackHoursIsValid) return;
    closeRecoveryPreview();
    toggleMutation.mutate({
      enableIssueGraphLivenessAutoRecovery: true,
      issueGraphLivenessAutoRecoveryLookbackHours: parsedLookbackHours,
    }, {
      onSuccess: () => runRecoveryMutation.mutate(parsedLookbackHours),
    });
  }

  const flagText = (
    key: string,
    field: "title" | "description" | "footnote",
    defaultValue: string,
  ) => t(`instanceExperimental.flags.${key}.${field}`, { defaultValue });
  const flagAria = (key: string, defaultName: string) =>
    t("instanceExperimental.toggleAria", {
      defaultValue: "Toggle {{name}} experimental setting",
      name: flagText(key, "title", defaultName).toLocaleLowerCase(),
    });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{t("instanceExperimental.title", { defaultValue: "Experimental" })}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("instanceExperimental.subtitle", { defaultValue: "Opt into features that are still being evaluated before they become default behavior." })}
        </p>
      </div>

      <div
        role="alert"
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{t("instanceExperimental.warningTitle", { defaultValue: "Experimental features may break at any time." })}</p>
            <p className="text-muted-foreground">
              {t("instanceExperimental.warningDescription", {
                defaultValue:
                  "These features are opt-in and come with no compatibility guarantees. They may change, break, or be removed without notice. Avoid relying on them for critical or production workflows.",
              })}
            </p>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <ExperimentalToggleCard
        title={flagText("enableApps", "title", "Apps")}
        description={flagText("enableApps", "description", "Show the Apps navigation and allow access to app connections, gateways, and advanced app tooling.")}
        checked={enableApps}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableApps: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableApps"
        managed={managedKeys.enableApps}
        ariaLabel={flagAria("enableApps", "Apps")}
      />

      <Card className="block p-5">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{t("instanceExperimental.autoRecoveryTitle", { defaultValue: "Auto-Create Recovery Tasks" })}</h2>
                {autoRecoveryManaged ? <ManagedByCloudBadge /> : null}
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("instanceExperimental.autoRecoveryDescription", {
                  defaultValue:
                    "Let the heartbeat scheduler create recovery tasks for task dependency chains found inside the configured lookback window.",
                })}
              </p>
            </div>
            <ToggleSwitch
              checked={enableIssueGraphLivenessAutoRecovery}
              onCheckedChange={() => {
                if (autoRecoveryManaged) return;
                if (enableIssueGraphLivenessAutoRecovery) {
                  toggleMutation.mutate({ enableIssueGraphLivenessAutoRecovery: false });
                  return;
                }
                previewForEnable();
              }}
              disabled={recoveryActionPending || autoRecoveryManaged}
              aria-label={t("instanceExperimental.autoRecoveryAria", { defaultValue: "Toggle task graph liveness auto-recovery" })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-(--gtc-35) sm:items-end">
            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t("instanceExperimental.lookbackHours", { defaultValue: "Lookback hours" })}
              </span>
              <Input
                type="number"
                min={1}
                max={720}
                step={1}
                value={lookbackHoursDraft}
                onChange={(event) => setLookbackHoursDraft(event.target.value)}
                aria-invalid={!lookbackHoursIsValid}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!lookbackHoursIsValid) {
                    setActionError(t("instanceExperimental.lookbackInvalid", { defaultValue: "Lookback hours must be a whole number from 1 to 720." }));
                    return;
                  }
                  toggleMutation.mutate({
                    issueGraphLivenessAutoRecoveryLookbackHours: parsedLookbackHours,
                  });
                }}
                disabled={recoveryActionPending || parsedLookbackHours === lookbackHours}
              >
                {t("instanceExperimental.saveHours", { defaultValue: "Save hours" })}
              </Button>
              <Button
                variant="outline"
                onClick={previewForEnable}
                disabled={recoveryActionPending}
              >
                <Search className="h-4 w-4" />
                {t("instanceExperimental.preview", { defaultValue: "Preview" })}
              </Button>
              <Button
                onClick={() => {
                  if (!lookbackHoursIsValid) {
                    setActionError(t("instanceExperimental.lookbackInvalid", { defaultValue: "Lookback hours must be a whole number from 1 to 720." }));
                    return;
                  }
                  runRecoveryMutation.mutate(parsedLookbackHours);
                }}
                disabled={recoveryActionPending || !enableIssueGraphLivenessAutoRecovery}
              >
                <Play className="h-4 w-4" />
                {t("instanceExperimental.runNow", { defaultValue: "Run now" })}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("instanceExperimental.currentWindow", {
              defaultValue: "Current window: last {{count}} hours.",
              count: lookbackHours,
            })}
          </p>
        </div>
      </Card>

      <ExperimentalToggleCard
        title={flagText("autoRestartDevServerWhenIdle", "title", "Auto-Restart Dev Server When Idle")}
        description={flagText("autoRestartDevServerWhenIdle", "description", "In `pnpm dev:once`, wait for all queued and running local agent runs to finish, then restart the server automatically when backend changes or migrations make the current boot stale.")}
        checked={autoRestartDevServerWhenIdle}
        onCheckedChange={(checked) => toggleMutation.mutate({ autoRestartDevServerWhenIdle: checked })}
        disabled={toggleMutation.isPending}
        settingKey="autoRestartDevServerWhenIdle"
        managed={managedKeys.autoRestartDevServerWhenIdle}
        ariaLabel={flagAria("autoRestartDevServerWhenIdle", "Auto-Restart Dev Server When Idle")}
      />

      <ExperimentalToggleCard
        title={flagText("enableBetaSkills", "title", "Beta skills")}
        description={flagText("enableBetaSkills", "description", "Allow agents to pin beta releases of the Paperclip core skill. Disabling this returns every agent to the default live skill without removing saved pins.")}
        checked={enableBetaSkills}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableBetaSkills: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableBetaSkills"
        managed={managedKeys.enableBetaSkills}
        ariaLabel={flagAria("enableBetaSkills", "Beta skills")}
      />

      <ExperimentalToggleCard
        title={flagText("enableBuiltInAgents", "title", "Built-in Agents")}
        description={flagText("enableBuiltInAgents", "description", "Show Paperclip-managed built-in agent surfaces, including built-in roster badges, the Built-in agents tab, and built-in agent setup controls.")}
        checked={enableBuiltInAgents}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableBuiltInAgents: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableBuiltInAgents"
        managed={managedKeys.enableBuiltInAgents}
        ariaLabel={flagAria("enableBuiltInAgents", "Built-in Agents")}
      />

      <ExperimentalToggleCard
        title={flagText("enableCases", "title", "Cases")}
        description={flagText("enableCases", "description", "Durable work products (blog posts, tweet storms…) that tasks create and iterate on. Adds the Cases tab and the agent case API.")}
        footnote={flagText("enableCases", "footnote", "Turning Cases off hides the tab and blocks the case API; existing case data is kept.")}
        checked={enableCases}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableCases: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableCases"
        managed={managedKeys.enableCases}
        ariaLabel={flagAria("enableCases", "Cases")}
      />

      <ExperimentalToggleCard
        title={flagText("enableClassicTaskInterface", "title", "Classic Task Interface")}
        description={flagText("enableClassicTaskInterface", "description", "Restores the previous task detail page: the page-level header with inline description editing, the plain comment thread, and the fixed Properties sidebar. Chat-only features — streaming activity folding, inline plan and question cards, the three-mode composer — are unavailable in the classic view.")}
        footnote={flagText("enableClassicTaskInterface", "footnote", "Switching takes effect immediately. No task data is affected.")}
        checked={enableClassicTaskInterface}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableClassicTaskInterface: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableClassicTaskInterface"
        managed={managedKeys.enableClassicTaskInterface}
        ariaLabel={flagAria("enableClassicTaskInterface", "Classic Task Interface")}
      />

      {SHOW_CONFERENCE_ROOM_EXPERIMENTAL_SETTING ? (
        <ExperimentalToggleCard
          title={flagText("enableConferenceRoomChat", "title", "Conference Room Chat")}
          description={flagText("enableConferenceRoomChat", "description", "Adds a Conference Room — one chat where you and your whole team work together — plus the live activity feed and the redesigned onboarding. Also restyles task threads as chat bubbles. Turn off anytime to restore the classic UI.")}
          checked={enableConferenceRoomChat}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableConferenceRoomChat: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableConferenceRoomChat"
          managed={managedKeys.enableConferenceRoomChat}
          ariaLabel={flagAria("enableConferenceRoomChat", "Conference Room Chat")}
        />
      ) : null}

      <ExperimentalToggleCard
        title={flagText("enableDecisions", "title", "Decisions")}
        description={flagText("enableDecisions", "description", "Show the Decisions item in the main sidebar — the attention home that surfaces the tasks awaiting your input — while the surface is still being evaluated.")}
        checked={enableDecisions}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableDecisions: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableDecisions"
        managed={managedKeys.enableDecisions}
        ariaLabel={flagAria("enableDecisions", "Decisions")}
      />

      <ExperimentalToggleCard
        title={flagText("enableEnvironments", "title", "Enable Environments")}
        description={flagText("enableEnvironments", "description", "Show environment management in company settings and allow project and agent environment assignment controls.")}
        checked={enableEnvironments}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableEnvironments: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableEnvironments"
        managed={managedKeys.enableEnvironments}
        ariaLabel={flagAria("enableEnvironments", "Enable Environments")}
      />

      <ExperimentalToggleCard
        title={flagText("enableExternalObjects", "title", "Enable External Objects")}
        description={flagText("enableExternalObjects", "description", "Detect external URLs in issues and show resolved status for pull requests, tickets, and other referenced work objects.")}
        checked={enableExternalObjects}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableExternalObjects: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableExternalObjects"
        managed={managedKeys.enableExternalObjects}
        ariaLabel={flagAria("enableExternalObjects", "Enable External Objects")}
      />

      <ExperimentalToggleCard
        title={flagText("enableIsolatedWorkspaces", "title", "Enable Isolated Workspaces")}
        description={flagText("enableIsolatedWorkspaces", "description", "Show execution workspace controls in project configuration and allow isolated workspace behavior for new and existing task runs.")}
        checked={enableIsolatedWorkspaces}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableIsolatedWorkspaces: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableIsolatedWorkspaces"
        managed={managedKeys.enableIsolatedWorkspaces}
        ariaLabel={flagAria("enableIsolatedWorkspaces", "Enable Isolated Workspaces")}
      />

      <ExperimentalToggleCard
        title={flagText("enableExperimentalFileViewer", "title", "Experimental File Viewer")}
        description={flagText("enableExperimentalFileViewer", "description", "Show task detail controls for browsing and previewing workspace files relative to a task.")}
        checked={enableExperimentalFileViewer}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableExperimentalFileViewer: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableExperimentalFileViewer"
        managed={managedKeys.enableExperimentalFileViewer}
        ariaLabel={flagAria("enableExperimentalFileViewer", "Experimental File Viewer")}
      />

      <ExperimentalToggleCard
        title={flagText("enableGoalsSidebarLink", "title", "Goals Sidebar Link")}
        description={flagText("enableGoalsSidebarLink", "description", "Restore the Goals item in the main sidebar while the goals surface is being evaluated.")}
        checked={enableGoalsSidebarLink}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableGoalsSidebarLink: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableGoalsSidebarLink"
        managed={managedKeys.enableGoalsSidebarLink}
        ariaLabel={flagAria("enableGoalsSidebarLink", "Goals Sidebar Link")}
      />

      <ExperimentalToggleCard
        title={flagText("enableManagedSandboxOnly", "title", "Managed Environment Only")}
        description={flagText("enableManagedSandboxOnly", "description", "Hide the local environment and run all agents in the platform-managed environment.")}
        checked={enableManagedSandboxOnly}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableManagedSandboxOnly: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableManagedSandboxOnly"
        managed={managedKeys.enableManagedSandboxOnly}
        ariaLabel={flagAria("enableManagedSandboxOnly", "Managed Environment Only")}
      />

      {inWorktree ? (
        <Card className="block p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    {t("instanceExperimental.worktreeTitle", { defaultValue: "Run tasks in this worktree" })}
                  </h2>
                  {worktreeRunExecutionManaged ? <ManagedByCloudBadge /> : null}
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {t("instanceExperimental.worktreeDescription", {
                    defaultValue:
                      "This is an isolated git-worktree preview instance. Turn this on to let the scheduler execute runs here. Only tasks created after enabling will run automatically — copied/pre-existing tasks stay parked. Toggling off and on resets the cutoff.",
                  })}
                </p>
              </div>
              <ToggleSwitch
                checked={enableWorktreeRunExecution}
                onCheckedChange={(checked) => {
                  if (worktreeRunExecutionManaged) return;
                  toggleMutation.mutate({ enableWorktreeRunExecution: checked });
                }}
                disabled={toggleMutation.isPending || worktreeRunExecutionManaged}
                aria-label={t("instanceExperimental.worktreeAria", { defaultValue: "Toggle worktree run execution setting" })}
              />
            </div>

            {worktreeRunExecutionState.kind === "armed" ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
                <Play className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  {t("instanceExperimental.armedDescription", {
                    defaultValue: "Running tasks created after {{time}}.",
                    time: formatActivationTimestamp(worktreeRunExecutionState.activatedAt),
                  })}
                </span>
              </div>
            ) : null}

            {worktreeRunExecutionState.kind === "fail_closed" ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">
                    {t("instanceExperimental.failClosedTitle", {
                      defaultValue: "Execution is suppressed — effectively off.",
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    {t(
                      worktreeRunExecutionState.reason === "instance_mismatch"
                        ? "instanceExperimental.failClosedInstanceMismatch"
                        : "instanceExperimental.failClosedMissingCutoff",
                      {
                        defaultValue:
                          worktreeRunExecutionState.reason === "instance_mismatch"
                            ? "This setting was armed in a different instance and copied here, so no tasks run automatically."
                            : "This setting is missing its activation cutoff, so no tasks run automatically.",
                      },
                    )}{" "}
                    {t("instanceExperimental.failClosedToggleHint", {
                      defaultValue: "Toggle it off and back on to arm execution for tasks created here.",
                    })}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <ExperimentalToggleCard
        title={flagText("enableServerInfoDebugView", "title", "Server Info Debug View")}
        description={flagText("enableServerInfoDebugView", "description", 'Show a "Server" section in the account drawer with the current server restart time and running commit.')}
        checked={enableServerInfoDebugView}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableServerInfoDebugView: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableServerInfoDebugView"
        managed={managedKeys.enableServerInfoDebugView}
        ariaLabel={flagAria("enableServerInfoDebugView", "Server Info Debug View")}
      />

      <ExperimentalToggleCard
        title={flagText("enableSimplifiedEnglishInteractions", "title", "Simplified English Interactions")}
        description={flagText("enableSimplifiedEnglishInteractions", "description", "Instruct agents to write user interactions (plan confirmations, questions, suggested tasks, checkbox prompts) in ASD-STE100 Simplified Technical English, with brief context on what information the decision needs and what happens for each choice.")}
        checked={enableSimplifiedEnglishInteractions}
        onCheckedChange={(checked) =>
          toggleMutation.mutate({ enableSimplifiedEnglishInteractions: checked })
        }
        disabled={toggleMutation.isPending}
        settingKey="enableSimplifiedEnglishInteractions"
        managed={managedKeys.enableSimplifiedEnglishInteractions}
        ariaLabel={flagAria("enableSimplifiedEnglishInteractions", "Simplified English Interactions")}
      />

      <ExperimentalToggleCard
        title={flagText("enableSmokeLab", "title", "Smoke Lab")}
        description={flagText("enableSmokeLab", "description", 'Add a "Smoke Lab" tab under Apps → Developer and an "Integration smoke" card on the dashboard for exercising every integration path against deterministic local fixtures (fake OAuth provider + loopback MCP servers). Private (non-public) deployments only.')}
        checked={enableSmokeLab}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableSmokeLab: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableSmokeLab"
        managed={managedKeys.enableSmokeLab}
        ariaLabel={flagAria("enableSmokeLab", "Smoke Lab")}
      />

      <ExperimentalToggleCard
        title={flagText("enableStatusCards", "title", "Status Cards")}
        description={flagText("enableStatusCards", "description", "Enable the experimental shared status-card board and its gated API. Existing card data is kept when this is disabled.")}
        footnote={flagText("enableStatusCards", "footnote", "Enabling Status Cards also enables Summaries.")}
        checked={enableStatusCards}
        onCheckedChange={(checked) =>
          toggleMutation.mutate(
            checked
              ? { enableSummaries: true, enableStatusCards: true }
              : { enableStatusCards: false },
          )
        }
        disabled={toggleMutation.isPending || statusCardsBlockedByManagedSummaries}
        settingKey="enableStatusCards"
        managed={managedKeys.enableStatusCards}
        ariaLabel={flagAria("enableStatusCards", "Status Cards")}
      />

      <ExperimentalToggleCard
        title={flagText("enableSummaries", "title", "Summaries")}
        description={flagText("enableSummaries", "description", "Show Summarizer-generated status slots on project and workspace pages, with on-demand refresh and revision history. Existing summary data is kept when this is disabled.")}
        footnote={flagText("enableSummaries", "footnote", "Status Cards requires Summaries. Disabling Summaries also disables Status Cards.")}
        checked={enableSummaries}
        onCheckedChange={(checked) =>
          toggleMutation.mutate(
            checked || !enableStatusCards
              ? { enableSummaries: checked }
              : { enableSummaries: false, enableStatusCards: false },
          )
        }
        disabled={toggleMutation.isPending || summariesRequiredByManagedStatusCards}
        settingKey="enableSummaries"
        managed={managedKeys.enableSummaries}
        ariaLabel={flagAria("enableSummaries", "Summaries")}
      />

      <ExperimentalToggleCard
        title={flagText("enableIssuePlanDecompositions", "title", "Task Plan Decomposition Panel")}
        description={flagText("enableIssuePlanDecompositions", "description", "Show accepted-plan decomposition history on task detail pages. Intended for debugging and validating subtask creation behavior while the presentation is still being refined.")}
        checked={enableIssuePlanDecompositions}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableIssuePlanDecompositions: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableIssuePlanDecompositions"
        managed={managedKeys.enableIssuePlanDecompositions}
        ariaLabel={flagAria("enableIssuePlanDecompositions", "Task Plan Decomposition Panel")}
      />

      <ExperimentalToggleCard
        title={flagText("enableTaskWatchdogs", "title", "Task Watchdogs")}
        description={flagText("enableTaskWatchdogs", "description", "Show task detail controls for configuring watchdog agents that verify stopped task subtrees and restore live paths when work should continue.")}
        checked={enableTaskWatchdogs}
        onCheckedChange={(checked) => toggleMutation.mutate({ enableTaskWatchdogs: checked })}
        disabled={toggleMutation.isPending}
        settingKey="enableTaskWatchdogs"
        managed={managedKeys.enableTaskWatchdogs}
        ariaLabel={flagAria("enableTaskWatchdogs", "Task Watchdogs")}
      />

      {previewDialogOpen && !autoRecoveryManaged ? (
        <RecoveryPreviewDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              closeRecoveryPreview();
            }
          }}
          preview={pendingPreview}
          onEnableOnly={enableOnly}
          onEnableAndRun={enableAndRun}
          isPending={recoveryActionPending}
        />
      ) : null}
    </div>
  );
}
