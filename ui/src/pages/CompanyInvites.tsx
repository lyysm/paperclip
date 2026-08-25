import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, MailPlus } from "lucide-react";
import { accessApi } from "@/api/access";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { Link } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { copyTextToClipboard } from "@/lib/clipboard";
import { Badge } from "@/components/ui/badge";
import { t, useTranslation } from "@/i18n";

const inviteRoleOptions = [
  {
    value: "viewer",
    labelKey: "companyInvites.roleViewer",
    descriptionKey: "companyInvites.roleViewerDescription",
    getsKey: "companyInvites.roleViewerGets",
  },
  {
    value: "operator",
    labelKey: "companyInvites.roleOperator",
    descriptionKey: "companyInvites.roleOperatorDescription",
    getsKey: "companyInvites.roleOperatorGets",
  },
  {
    value: "admin",
    labelKey: "companyInvites.roleAdmin",
    descriptionKey: "companyInvites.roleAdminDescription",
    getsKey: "companyInvites.roleAdminGets",
  },
  {
    value: "owner",
    labelKey: "companyInvites.roleOwner",
    descriptionKey: "companyInvites.roleOwnerDescription",
    getsKey: "companyInvites.roleOwnerGets",
  },
] as const;

const INVITE_HISTORY_PAGE_SIZE = 5;

function isInviteHistoryRow(value: unknown): value is Awaited<ReturnType<typeof accessApi.listInvites>>["invites"][number] {
  if (!value || typeof value !== "object") return false;
  return "id" in value && "state" in value && "createdAt" in value;
}

export function CompanyInvites() {
  const { t } = useTranslation();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [humanRole, setHumanRole] = useState<"owner" | "admin" | "operator" | "viewer">("operator");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteCopied, setLatestInviteCopied] = useState(false);
  const latestInviteInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!latestInviteCopied) return;
    const timeout = window.setTimeout(() => {
      setLatestInviteCopied(false);
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [latestInviteCopied]);

  function selectLatestInviteUrl() {
    latestInviteInputRef.current?.focus();
    latestInviteInputRef.current?.select();
  }

  async function copyText(text: string, unavailableBody: string, afterFallback?: () => void) {
    try {
      await copyTextToClipboard(text);
      return true;
    } catch {
      afterFallback?.();
    }
    pushToast({
      title: t("companyInvites.clipboardUnavailable", { defaultValue: "Clipboard unavailable" }),
      body: unavailableBody,
      tone: "warn",
    });
    return false;
  }

  async function copyInviteUrl(url: string) {
    return copyText(url, t("companyInvites.inviteUrlSelected", { defaultValue: "The invite URL is selected. Copy it manually from the field." }), selectLatestInviteUrl);
  }

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? t("nav.company", { defaultValue: "Company" }), href: "/dashboard" },
      { label: t("nav.settings", { defaultValue: "Settings" }), href: "/company/settings" },
      { label: t("companyInvites.invites", { defaultValue: "Invites" }) },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs, t]);

  const inviteHistoryQueryKey = queryKeys.access.invites(selectedCompanyId ?? "", "all", INVITE_HISTORY_PAGE_SIZE);
  const invitesQuery = useInfiniteQuery({
    queryKey: inviteHistoryQueryKey,
    queryFn: ({ pageParam }) =>
      accessApi.listInvites(selectedCompanyId!, {
        limit: INVITE_HISTORY_PAGE_SIZE,
        offset: pageParam,
      }),
    enabled: !!selectedCompanyId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const inviteHistory = useMemo(
    () =>
      invitesQuery.data?.pages.flatMap((page) =>
        Array.isArray(page?.invites) ? page.invites.filter(isInviteHistoryRow) : [],
      ) ?? [],
    [invitesQuery.data?.pages],
  );

  const createInviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createCompanyInvite(selectedCompanyId!, {
        allowedJoinTypes: "human",
        humanRole,
        agentMessage: null,
      }),
    onSuccess: async (invite) => {
      setLatestInviteUrl(invite.inviteUrl);
      setLatestInviteCopied(false);
      const copied = await copyText(invite.inviteUrl, t("companyInvites.copyUrlManually", { defaultValue: "Copy the invite URL manually from the field below." }));

      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({
        title: t("companyInvites.inviteCreated", { defaultValue: "Invite created" }),
        body: copied
          ? t("companyInvites.inviteReadyCopied", { defaultValue: "Invite ready below and copied to clipboard." })
          : t("companyInvites.inviteReady", { defaultValue: "Invite ready below." }),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyInvites.createFailed", { defaultValue: "Failed to create invite" }),
        body: error instanceof Error ? error.message : t("companyInvites.unknownError", { defaultValue: "Unknown error" }),
        tone: "error",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => accessApi.revokeInvite(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({ title: t("companyInvites.inviteRevoked", { defaultValue: "Invite revoked" }), tone: "success" });
    },
    onError: (error) => {
      pushToast({
        title: t("companyInvites.revokeFailed", { defaultValue: "Failed to revoke invite" }),
        body: error instanceof Error ? error.message : t("companyInvites.unknownError", { defaultValue: "Unknown error" }),
        tone: "error",
      });
    },
  });

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">{t("companyInvites.selectCompany", { defaultValue: "Select a company to manage invites." })}</div>;
  }

  if (invitesQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("companyInvites.loading", { defaultValue: "Loading invites…" })}</div>;
  }

  if (invitesQuery.error) {
    const message =
      invitesQuery.error instanceof ApiError && invitesQuery.error.status === 403
        ? t("companyInvites.noPermission", { defaultValue: "You do not have permission to manage company invites." })
        : invitesQuery.error instanceof Error
          ? invitesQuery.error.message
          : t("companyInvites.loadFailed", { defaultValue: "Failed to load invites." });
    return <div className="text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MailPlus className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("companyInvites.title", { defaultValue: "Company Invites" })}</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("companyInvites.description", { defaultValue: "Invite people to request access to this company. New invite links are copied to your clipboard when they are generated." })}
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{t("companyInvites.invitePerson", { defaultValue: "Invite a person" })}</h2>
          <p className="text-sm text-muted-foreground">
            {t("companyInvites.invitePersonDescription", { defaultValue: "Generate a human invite link and choose the default access it should request." })}
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t("companyInvites.chooseRole", { defaultValue: "Choose a role" })}</legend>
          <div className="rounded-xl border border-border">
            {inviteRoleOptions.map((option, index) => {
              const checked = humanRole === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 px-4 py-4 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={option.value}
                    checked={checked}
                    onChange={() => setHumanRole(option.value)}
                    className="mt-1 h-4 w-4 border-border text-foreground"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t(option.labelKey, { defaultValue: option.value })}</span>
                      {option.value === "operator" ? (
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {t("companyInvites.defaultRole", { defaultValue: "Default" })}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="block max-w-2xl text-sm text-muted-foreground">{t(option.descriptionKey, { defaultValue: "" })}</span>
                    <span className="block text-sm text-foreground">{t(option.getsKey, { defaultValue: "" })}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
          {t("companyInvites.singleUseNotice", { defaultValue: "Each invite link is single-use. Human invitees get the selected role immediately after sign-in; agent invites still create a join request for approval." })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => createInviteMutation.mutate()} disabled={createInviteMutation.isPending}>
            {createInviteMutation.isPending
              ? t("companyInvites.creating", { defaultValue: "Creating…" })
              : t("companyInvites.createInvite", { defaultValue: "Create invite" })}
          </Button>
          <span className="text-sm text-muted-foreground">{t("companyInvites.auditTrailHint", { defaultValue: "Invite history below keeps the audit trail." })}</span>
        </div>

        {latestInviteUrl ? (
          <div className="space-y-3 rounded-lg border border-border px-4 py-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{t("companyInvites.latestInviteLink", { defaultValue: "Latest invite link" })}</div>
                {latestInviteCopied ? (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    <Check className="h-3.5 w-3.5" />
                    {t("companyInvites.copied", { defaultValue: "Copied" })}
                  </div>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("companyInvites.latestInviteDescription", { defaultValue: "This URL includes the current Paperclip domain returned by the server." })}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="sr-only">{t("companyInvites.latestInviteUrl", { defaultValue: "Latest invite URL" })}</span>
              <input
                ref={latestInviteInputRef}
                readOnly
                value={latestInviteUrl}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
                className="w-full rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground outline-none transition-colors selection:bg-primary selection:text-primary-foreground focus:border-ring"
                aria-label={t("companyInvites.latestInviteUrl", { defaultValue: "Latest invite URL" })}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  const copied = await copyInviteUrl(latestInviteUrl);
                  setLatestInviteCopied(copied);
                }}
              >
                <Copy className="h-4 w-4" />
                {t("companyInvites.copyLink", { defaultValue: "Copy link" })}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={latestInviteUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("companyInvites.openInvite", { defaultValue: "Open invite" })}
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("companyInvites.history", { defaultValue: "Invite history" })}</h2>
            <p className="text-sm text-muted-foreground">
              {t("companyInvites.historyDescription", { defaultValue: "Review invite status, audience, inviter, and any linked join request." })}
            </p>
          </div>
          <Link to="/inbox/requests" className="text-sm underline underline-offset-4">
            {t("companyInvites.openJoinQueue", { defaultValue: "Open join request queue" })}
          </Link>
        </div>

        {inviteHistory.length === 0 ? (
          <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">
            {t("companyInvites.noInvites", { defaultValue: "No invites have been created for this company yet." })}
          </div>
        ) : (
          <div className="border-t border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyInvites.state", { defaultValue: "State" })}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyInvites.for", { defaultValue: "For" })}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyInvites.invitedBy", { defaultValue: "Invited by" })}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyInvites.created", { defaultValue: "Created" })}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{t("companyInvites.joinRequest", { defaultValue: "Join request" })}</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("companyInvites.action", { defaultValue: "Action" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteHistory.map((invite) => (
                    <tr key={invite.id} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3 align-top">
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {formatInviteState(invite.state)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 align-top">{formatInviteAudience(invite)}</td>
                      <td className="px-5 py-3 align-top">
                        <div>{invite.invitedByUser?.name || invite.invitedByUser?.email || t("companyInvites.unknownInviter", { defaultValue: "Unknown inviter" })}</div>
                        {invite.invitedByUser?.email && invite.invitedByUser.name ? (
                          <div className="text-xs text-muted-foreground">{invite.invitedByUser.email}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 align-top text-muted-foreground">
                        {new Date(invite.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {invite.relatedJoinRequestId ? (
                          <Link to="/inbox/requests" className="underline underline-offset-4">
                            {t("companyInvites.reviewRequest", { defaultValue: "Review request" })}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right align-top">
                        {invite.state === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokeMutation.mutate(invite.id)}
                            disabled={revokeMutation.isPending}
                          >
                            {t("companyInvites.revoke", { defaultValue: "Revoke" })}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("companyInvites.inactive", { defaultValue: "Inactive" })}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invitesQuery.hasNextPage ? (
              <div className="flex justify-center border-t border-border px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => invitesQuery.fetchNextPage()}
                  disabled={invitesQuery.isFetchingNextPage}
                >
                  {invitesQuery.isFetchingNextPage
                    ? t("companyInvites.loadingMore", { defaultValue: "Loading more…" })
                    : t("companyInvites.viewMore", { defaultValue: "View more" })}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function formatInviteState(state: "active" | "accepted" | "expired" | "revoked") {
  return t(`companyInvites.stateLabel.${state}`, { defaultValue: state.charAt(0).toUpperCase() + state.slice(1) });
}

function formatInviteAudience(invite: Awaited<ReturnType<typeof accessApi.listInvites>>["invites"][number]) {
  if (invite.allowedJoinTypes === "agent") return t("companyInvites.audienceAgent", { defaultValue: "Agent" });
  if (invite.allowedJoinTypes === "both") return invite.humanRole
    ? t("companyInvites.audienceBothWithRole", { defaultValue: "Human or agent · {{role}}", role: invite.humanRole })
    : t("companyInvites.audienceBoth", { defaultValue: "Human or agent" });
  return invite.humanRole ?? t("companyInvites.audienceHuman", { defaultValue: "Human" });
}
