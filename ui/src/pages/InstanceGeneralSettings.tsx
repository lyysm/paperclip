import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatchInstanceGeneralSettings, BackupRetentionPolicy } from "@paperclipai/shared";
import {
  DAILY_RETENTION_PRESETS,
  WEEKLY_RETENTION_PRESETS,
  MONTHLY_RETENTION_PRESETS,
  DEFAULT_BACKUP_RETENTION,
} from "@paperclipai/shared";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { healthApi } from "@/api/health";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useTranslation } from "@/i18n";
import { ModeBadge } from "@/components/access/ModeBadge";
import { Button } from "../components/ui/button";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "../lib/utils";
import { useSignOut } from "@/hooks/useSignOut";

const FEEDBACK_TERMS_URL = import.meta.env.VITE_FEEDBACK_TERMS_URL?.trim() || "https://paperclip.ing/tos";

export function InstanceGeneralSettings({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const signOutMutation = useSignOut();

  useEffect(() => {
    if (embedded) return;
    setBreadcrumbs([
      { label: t("nav.settings", { defaultValue: "Settings" }), href: "/company/settings" },
      { label: t("companySettings.general", { defaultValue: "General" }) },
    ]);
  }, [embedded, setBreadcrumbs]);

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
  });

  const updateGeneralMutation = useMutation({
    mutationFn: instanceSettingsApi.updateGeneral,
    onMutate: () => {
      setActionError(null);
      signOutMutation.reset();
    },
    onSuccess: async () => {
      setActionError(null);
      signOutMutation.reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceGeneral.updateFailed", { defaultValue: "Failed to update general settings." }));
    },
  });

  if (generalQuery.isLoading || healthQuery.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("instanceGeneral.loading", { defaultValue: "Loading general settings..." })}
      </div>
    );
  }

  if (generalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {generalQuery.error instanceof Error
          ? generalQuery.error.message
          : t("instanceGeneral.loadFailed", { defaultValue: "Failed to load general settings." })}
      </div>
    );
  }

  const censorUsernameInLogs = generalQuery.data?.censorUsernameInLogs === true;
  const keyboardShortcuts = generalQuery.data?.keyboardShortcuts === true;
  const feedbackDataSharingPreference = generalQuery.data?.feedbackDataSharingPreference ?? "prompt";
  const backupRetention: BackupRetentionPolicy = generalQuery.data?.backupRetention ?? DEFAULT_BACKUP_RETENTION;
  const hiddenSettings = new Set(healthQuery.data?.hiddenSettings ?? []);
  const showDeploymentStatus = !hiddenSettings.has("instance.general.deploymentStatus");
  const showCensorUsernameInLogs = !hiddenSettings.has("instance.general.censorUsernameInLogs");
  const showKeyboardShortcuts = !hiddenSettings.has("instance.general.keyboardShortcuts");
  const showBackupRetention = !hiddenSettings.has("instance.general.backupRetention");
  const showFeedbackDataSharing = !hiddenSettings.has("instance.general.feedbackDataSharingPreference");
  const showSignOut = !hiddenSettings.has("instance.general.signOut");
  const visibleTopics = [
    ...(showCensorUsernameInLogs ? [t("instanceGeneral.topic.logDisplay", { defaultValue: "log display" })] : []),
    ...(showKeyboardShortcuts ? [t("instanceGeneral.topic.keyboardShortcuts", { defaultValue: "keyboard shortcuts" })] : []),
    ...(showBackupRetention ? [t("instanceGeneral.topic.backupRetention", { defaultValue: "backup retention" })] : []),
    ...(showFeedbackDataSharing ? [t("instanceGeneral.topic.dataSharing", { defaultValue: "data sharing" })] : []),
  ];
  const topicSummary = visibleTopics.length > 2
    ? `${visibleTopics.slice(0, -1).join(t("instanceGeneral.topicSeparator", { defaultValue: ", " }))}${t("instanceGeneral.topicLastJoiner", { defaultValue: ", and " })}${visibleTopics[visibleTopics.length - 1]}`
    : visibleTopics.join(t("instanceGeneral.topicTwoJoiner", { defaultValue: " and " }));
  const visibleActionError = signOutMutation.error instanceof Error
    ? signOutMutation.error.message
    : signOutMutation.error
      ? t("instanceGeneral.signOutFailed", { defaultValue: "Failed to sign out." })
      : actionError;

  return (
    <div className={embedded ? "space-y-8" : "max-w-4xl space-y-8"}>
      {!embedded ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">
              {t("companySettings.general", { defaultValue: "General" })}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("instanceGeneral.subtitle", {
              defaultValue: "Configure instance-wide preferences"
            })}
            {visibleTopics.length > 0
              ? t("instanceGeneral.subtitleIncluding", {
                  defaultValue: " including {{topics}}",
                  topics: topicSummary
                })
              : null}
            {t("instanceGeneral.subtitleEnd", { defaultValue: "." })}
          </p>
        </div>
      ) : null}

      {visibleActionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {visibleActionError}
        </div>
      )}

      {showDeploymentStatus && (
      <section>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">
              {t("instanceGeneral.deploymentAndAuth", { defaultValue: "Deployment and auth" })}
            </h2>
            <ModeBadge
              deploymentMode={healthQuery.data?.deploymentMode}
              deploymentExposure={healthQuery.data?.deploymentExposure}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {healthQuery.data?.deploymentMode === "local_trusted"
              ? t("instanceGeneral.modeLocalTrusted", {
                  defaultValue:
                    "Local trusted mode is optimized for a local operator. Browser requests run as local board context and no sign-in is required."
                })
              : healthQuery.data?.deploymentExposure === "public"
                ? t("instanceGeneral.modePublic", {
                    defaultValue:
                      "Authenticated public mode requires sign-in for board access and is intended for public URLs."
                  })
                : t("instanceGeneral.modePrivate", {
                    defaultValue:
                      "Authenticated private mode requires sign-in and is intended for LAN, VPN, or other private-network deployments."
                  })}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <StatusBox
              label={t("instanceGeneral.authReadiness", { defaultValue: "Auth readiness" })}
              value={healthQuery.data?.authReady
                ? t("instanceGeneral.ready", { defaultValue: "Ready" })
                : t("instanceGeneral.notReady", { defaultValue: "Not ready" })}
            />
            <StatusBox
              label={t("instanceGeneral.bootstrapStatus", { defaultValue: "Bootstrap status" })}
              value={healthQuery.data?.bootstrapStatus === "bootstrap_pending"
                ? t("instanceGeneral.setupRequired", { defaultValue: "Setup required" })
                : t("instanceGeneral.ready", { defaultValue: "Ready" })}
            />
            <StatusBox
              label={t("instanceGeneral.bootstrapInvite", { defaultValue: "Bootstrap invite" })}
              value={healthQuery.data?.bootstrapInviteActive
                ? t("instanceGeneral.active", { defaultValue: "Active" })
                : t("instanceGeneral.none", { defaultValue: "None" })}
            />
          </div>
        </div>
      </section>
      )}

      {showCensorUsernameInLogs && (
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("instanceGeneral.censorTitle", { defaultValue: "Censor username in logs" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.censorDescription", {
                defaultValue:
                  "Hide the username segment in home-directory paths and similar operator-visible log output. Standalone username mentions outside of paths are not yet masked in the live transcript view. This is off by default."
              })}
            </p>
          </div>
          <ToggleSwitch
            checked={censorUsernameInLogs}
            onCheckedChange={() => updateGeneralMutation.mutate({ censorUsernameInLogs: !censorUsernameInLogs })}
            disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
            aria-label={t("instanceGeneral.censorAria", { defaultValue: "Toggle username log censoring" })}
          />
        </div>
      </section>
      )}

      {showKeyboardShortcuts && (
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("instanceGeneral.shortcutsTitle", { defaultValue: "Keyboard shortcuts" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.shortcutsDescription", {
                defaultValue:
                  "Enable app keyboard shortcuts, including inbox navigation and global shortcuts like creating tasks or toggling panels. This is off by default."
              })}
            </p>
          </div>
          <ToggleSwitch
            checked={keyboardShortcuts}
            onCheckedChange={() => updateGeneralMutation.mutate({ keyboardShortcuts: !keyboardShortcuts })}
            disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
            aria-label={t("instanceGeneral.shortcutsAria", { defaultValue: "Toggle keyboard shortcuts" })}
          />
        </div>
      </section>
      )}

      {showBackupRetention && (
      <section>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("instanceGeneral.backupTitle", { defaultValue: "Backup retention" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.backupDescription", {
                defaultValue:
                  "Configure how long automatic database backups are retained. Backups run roughly every hour and are compressed with gzip. Within the daily window all backups are kept; beyond that, one backup per week and one per month are preserved."
              })}
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("instanceGeneral.daily", { defaultValue: "Daily" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {DAILY_RETENTION_PRESETS.map((days) => {
                const active = backupRetention.dailyDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, dailyDays: days },
                      })
                    }
                  >
                    <div className="text-sm font-medium">
                      {t("instanceGeneral.daysLabel", { defaultValue: "{{count}} days", count: days })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("instanceGeneral.weekly", { defaultValue: "Weekly" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {WEEKLY_RETENTION_PRESETS.map((weeks) => {
                const active = backupRetention.weeklyWeeks === weeks;
                const label = t("instanceGeneral.weeksLabel", { defaultValue: "{{count}} weeks", count: weeks });
                return (
                  <button
                    key={weeks}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, weeklyWeeks: weeks },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("instanceGeneral.monthly", { defaultValue: "Monthly" })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {MONTHLY_RETENTION_PRESETS.map((months) => {
                const active = backupRetention.monthlyMonths === months;
                const label = t("instanceGeneral.monthsLabel", { defaultValue: "{{count}} months", count: months });
                return (
                  <button
                    key={months}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, monthlyMonths: months },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      )}

      {showFeedbackDataSharing && (
      <section>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("instanceGeneral.feedbackTitle", { defaultValue: "AI feedback sharing" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.feedbackDescription", {
                defaultValue:
                  "Control whether thumbs up and thumbs down votes can send the voted AI output to Paperclip Labs. Votes are always saved locally."
              })}
            </p>
            {FEEDBACK_TERMS_URL ? (
              <a
                href={FEEDBACK_TERMS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("instanceGeneral.readTerms", { defaultValue: "Read our terms of service" })}
              </a>
            ) : null}
          </div>
          {feedbackDataSharingPreference === "prompt" ? (
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm text-muted-foreground">
              {t("instanceGeneral.feedbackPromptNote", {
                defaultValue:
                  "No default is saved yet. The next thumbs up or thumbs down choice will ask once and then save the answer here."
              })}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {[
              {
                value: "allowed",
                label: t("instanceGeneral.alwaysAllow", { defaultValue: "Always allow" }),
                description: t("instanceGeneral.alwaysAllowDescription", {
                  defaultValue: "Share voted AI outputs automatically."
                }),
              },
              {
                value: "not_allowed",
                label: t("instanceGeneral.dontAllow", { defaultValue: "Don't allow" }),
                description: t("instanceGeneral.dontAllowDescription", {
                  defaultValue: "Keep voted AI outputs local only."
                }),
              },
            ].map((option) => {
              const active = feedbackDataSharingPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border bg-background hover:bg-accent/50",
                  )}
                  onClick={() =>
                    updateGeneralMutation.mutate({
                      feedbackDataSharingPreference: option.value as
                        | "allowed"
                        | "not_allowed",
                    })
                  }
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("instanceGeneral.devNoteA", { defaultValue: "To retest the first-use prompt in local dev, remove the " })}
            <code>feedbackDataSharingPreference</code>
            {t("instanceGeneral.devNoteB", { defaultValue: " key from the " })}
            <code>instance_settings.general</code>
            {t("instanceGeneral.devNoteC", { defaultValue: " JSON row for this instance, or set it back to " })}
            <code>&quot;prompt&quot;</code>
            {t("instanceGeneral.devNoteD", { defaultValue: ". Unset and " })}
            <code>&quot;prompt&quot;</code>
            {t("instanceGeneral.devNoteE", { defaultValue: " both mean no default has been chosen yet." })}
          </p>
        </div>
      </section>

      )}

      {showSignOut && (
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">
              {t("common.signOut", { defaultValue: "Sign out" })}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.signOutDescription", {
                defaultValue: "Sign out of this Paperclip instance. You will be redirected to the login page."
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={signOutMutation.isPending || updateGeneralMutation.isPending}
            onClick={() => {
              setActionError(null);
              signOutMutation.mutate();
            }}
          >
            <LogOut className="size-4" />
            {signOutMutation.isPending
              ? t("common.signingOut", { defaultValue: "Signing out..." })
              : t("common.signOut", { defaultValue: "Sign out" })}
          </Button>
        </div>
      </section>
      )}
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
