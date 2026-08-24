import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS,
  type Agent,
} from "@paperclipai/shared";
import { Shield, ShieldCheck, Trash2 } from "lucide-react";
import { accessApi, type CompanyMember } from "@/api/access";
import { agentsApi } from "@/api/agents";
import { ApiError } from "@/api/client";
import { issuesApi } from "@/api/issues";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "@/i18n";
import { Link, Navigate } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { usePluginSlots } from "@/plugins/slots";

const reassignmentIssueStatuses = "backlog,todo,in_progress,in_review,blocked,failed,timed_out";
type EditableMemberStatus = "pending" | "active" | "suspended";

export function CompanyAccess() {
  const { t } = useTranslation();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [reassignmentTarget, setReassignmentTarget] = useState<string>("__unassigned");
  const [draftRole, setDraftRole] = useState<CompanyMember["membershipRole"]>(null);
  const [draftStatus, setDraftStatus] = useState<EditableMemberStatus>("active");

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? t("nav.company", { defaultValue: "Company" }), href: "/dashboard" },
      { label: t("nav.settings", { defaultValue: "Settings" }), href: "/company/settings" },
      { label: t("companyAccess.breadcrumbMembers", { defaultValue: "Members" }) },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs, t]);

  const membersQuery = useQuery({
    queryKey: queryKeys.access.companyMembers(selectedCompanyId ?? ""),
    queryFn: () => accessApi.listMembers(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? ""),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const joinRequestsQuery = useQuery({
    queryKey: queryKeys.access.joinRequests(selectedCompanyId ?? "", "pending_approval"),
    queryFn: () => accessApi.listJoinRequests(selectedCompanyId!, "pending_approval"),
    enabled: !!selectedCompanyId && !!membersQuery.data?.access.canApproveJoinRequests,
  });

  const refreshAccessData = async () => {
    if (!selectedCompanyId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.access.companyMembers(selectedCompanyId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.access.companyUserDirectory(selectedCompanyId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(selectedCompanyId, "pending_approval") });
  };

  const updateMemberMutation = useMutation({
    mutationFn: async (input: { memberId: string; membershipRole: CompanyMember["membershipRole"]; status: EditableMemberStatus }) => {
      return accessApi.updateMember(selectedCompanyId!, input.memberId, {
        membershipRole: input.membershipRole,
        status: input.status,
      });
    },
    onSuccess: async () => {
      setEditingMemberId(null);
      await refreshAccessData();
      pushToast({
        title: t("companyAccess.memberUpdatedToast", { defaultValue: "Member updated" }),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAccess.updateMemberFailedToast", { defaultValue: "Failed to update member" }),
        body: error instanceof Error ? error.message : t("companyAccess.unknownError", { defaultValue: "Unknown error" }),
        tone: "error",
      });
    },
  });

  const approveJoinRequestMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.approveJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      await refreshAccessData();
      pushToast({
        title: t("companyAccess.joinRequestApprovedToast", { defaultValue: "Join request approved" }),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAccess.approveJoinRequestFailedToast", { defaultValue: "Failed to approve join request" }),
        body: error instanceof Error ? error.message : t("companyAccess.unknownError", { defaultValue: "Unknown error" }),
        tone: "error",
      });
    },
  });

  const rejectJoinRequestMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.rejectJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      await refreshAccessData();
      pushToast({
        title: t("companyAccess.joinRequestRejectedToast", { defaultValue: "Join request rejected" }),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAccess.rejectJoinRequestFailedToast", { defaultValue: "Failed to reject join request" }),
        body: error instanceof Error ? error.message : t("companyAccess.unknownError", { defaultValue: "Unknown error" }),
        tone: "error",
      });
    },
  });

  const editingMember = useMemo(
    () => membersQuery.data?.members.find((member) => member.id === editingMemberId) ?? null,
    [editingMemberId, membersQuery.data?.members],
  );
  const removingMember = useMemo(
    () => membersQuery.data?.members.find((member) => member.id === removingMemberId) ?? null,
    [removingMemberId, membersQuery.data?.members],
  );

  const assignedIssuesQuery = useQuery({
    queryKey: ["access", "member-assigned-issues", selectedCompanyId ?? "", removingMember?.principalId ?? ""],
    queryFn: () =>
      issuesApi.list(selectedCompanyId!, {
        assigneeUserId: removingMember!.principalId,
        status: reassignmentIssueStatuses,
      }),
    enabled: !!selectedCompanyId && !!removingMember,
  });

  const archiveMemberMutation = useMutation({
    mutationFn: async (input: { memberId: string; target: string }) => {
      const reassignment =
        input.target.startsWith("agent:")
          ? { assigneeAgentId: input.target.slice("agent:".length), assigneeUserId: null }
          : input.target.startsWith("user:")
            ? { assigneeAgentId: null, assigneeUserId: input.target.slice("user:".length) }
            : null;
      return accessApi.archiveMember(selectedCompanyId!, input.memberId, { reassignment });
    },
    onSuccess: async (result) => {
      setRemovingMemberId(null);
      setReassignmentTarget("__unassigned");
      await refreshAccessData();
      if (selectedCompanyId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.issues.listAssignedToMe(selectedCompanyId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.issues.listTouchedByMe(selectedCompanyId) });
      }
      pushToast({
        title: t("companyAccess.memberRemovedToast", { defaultValue: "Member removed" }),
        body:
          result.reassignedIssueCount > 0
            ? t("companyAccess.assignedTasksCleanedUp", {
                defaultValue: "{{count}} assigned tasks cleaned up.",
                count: result.reassignedIssueCount,
              })
            : undefined,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: t("companyAccess.removeMemberFailedToast", { defaultValue: "Failed to remove member" }),
        body: error instanceof Error ? error.message : t("companyAccess.unknownError", { defaultValue: "Unknown error" }),
        tone: "error",
      });
    },
  });

  useEffect(() => {
    if (!editingMember) return;
    setDraftRole(editingMember.membershipRole);
    setDraftStatus(isEditableMemberStatus(editingMember.status) ? editingMember.status : "suspended");
  }, [editingMember]);

  useEffect(() => {
    if (!removingMember) return;
    setReassignmentTarget("__unassigned");
  }, [removingMember]);

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">{t("companyAccess.noCompanySelected", { defaultValue: "Select a company to manage access." })}</div>;
  }

  if (membersQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("companyAccess.loading", { defaultValue: "Loading company access…" })}</div>;
  }

  if (membersQuery.error) {
    const message =
      membersQuery.error instanceof ApiError && membersQuery.error.status === 403
        ? t("companyAccess.permissionDenied", { defaultValue: "You do not have permission to manage company members." })
        : membersQuery.error instanceof Error
          ? membersQuery.error.message
          : t("companyAccess.loadFailed", { defaultValue: "Failed to load company members." });
    return <div className="text-sm text-destructive">{message}</div>;
  }

  const members = membersQuery.data?.members ?? [];
  const access = membersQuery.data?.access;
  const pendingHumanJoinRequests =
    joinRequestsQuery.data?.filter((request) => request.requestType === "human") ?? [];
  const joinRequestActionPending =
    approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending;
  const activeReassignmentUsers = members.filter(
    (member) =>
      member.status === "active" &&
      member.principalType === "user" &&
      member.id !== removingMemberId,
  );
  const activeReassignmentAgents = (agentsQuery.data ?? []).filter(isAssignableAgent);
  const assignedIssues = assignedIssuesQuery.data ?? [];

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{t("companyAccess.title", { defaultValue: "Company Members" })}</h1>
      </div>

      {access && !access.currentUserRole && (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {t("companyAccess.instanceAdminWithoutMembership", {
            defaultValue:
              "This account can manage access here through instance-admin privileges, but it does not currently hold an active company membership.",
          })}
        </div>
      )}

      <section className="space-y-4">
        {access?.canApproveJoinRequests && pendingHumanJoinRequests.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{t("companyAccess.pendingHumanJoins", { defaultValue: "Pending human joins" })}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("companyAccess.pendingHumanJoinsDescription", {
                    defaultValue: "Review pending join requests before they become active company members.",
                  })}
                </p>
              </div>
              <Badge variant="outline">
                {t("companyAccess.pendingCount", { defaultValue: "{{count}} pending", count: pendingHumanJoinRequests.length })}
              </Badge>
            </div>
            <div className="space-y-3">
              {pendingHumanJoinRequests.map((request) => (
                <PendingJoinRequestCard
                  key={request.id}
                  title={
                    request.requesterUser?.name ||
                    request.requestEmailSnapshot ||
                    request.requestingUserId ||
                    t("companyAccess.unknownRequester", { defaultValue: "Unknown human requester" })
                  }
                  subtitle={
                    request.requesterUser?.email ||
                    request.requestEmailSnapshot ||
                    request.requestingUserId ||
                    t("companyAccess.noEmail", { defaultValue: "No email available" })
                  }
                  context={
                    request.invite
                      ? `${t("companyAccess.joinInvite", {
                          defaultValue: "{{types}} join invite",
                          types: request.invite.allowedJoinTypes,
                        })}${request.invite.humanRole ? ` • ${t("companyAccess.defaultRole", { defaultValue: "default role {{role}}", role: request.invite.humanRole })}` : ""}`
                      : t("companyAccess.inviteMetadataUnavailable", { defaultValue: "Invite metadata unavailable" })
                  }
                  detail={t("companyAccess.submitted", {
                    defaultValue: "Submitted {{time}}",
                    time: new Date(request.createdAt).toLocaleString(),
                  })}
                  approveLabel={t("companyAccess.approveHuman", { defaultValue: "Approve human" })}
                  rejectLabel={t("companyAccess.rejectHuman", { defaultValue: "Reject human" })}
                  disabled={joinRequestActionPending}
                  onApprove={() => approveJoinRequestMutation.mutate(request.id)}
                  onReject={() => rejectJoinRequestMutation.mutate(request.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-(--sz-44rem) text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("companyAccess.name", { defaultValue: "Name" })}</th>
                <th className="px-3 py-2 font-medium">{t("companyAccess.email", { defaultValue: "Email" })}</th>
                <th className="px-3 py-2 font-medium">{t("companyAccess.role", { defaultValue: "Role" })}</th>
                <th className="px-3 py-2 font-medium">{t("companyAccess.status", { defaultValue: "Status" })}</th>
                <th className="px-3 py-2 text-right font-medium">{t("companyAccess.action", { defaultValue: "Action" })}</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-muted-foreground">
                    {t("companyAccess.noMemberships", { defaultValue: "No user memberships found for this company yet." })}
                  </td>
                </tr>
              ) : members.map((member) => {
                const removalReason = member.removal?.reason ?? null;
                const canArchive = member.removal?.canArchive ?? true;
                const displayName = memberDisplayName(member);
                return (
                  <tr key={member.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar size="sm">
                          {member.user?.image ? <AvatarImage src={member.user.image} alt={displayName} /> : null}
                          <AvatarFallback>{memberInitials(member)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{displayName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {member.user?.email || member.principalId}
                    </td>
                    <td className="px-3 py-3">
                      {member.membershipRole
                        ? memberRoleLabel(member.membershipRole, t)
                        : t("companyAccess.unset", { defaultValue: "Unset" })}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={member.status === "active" ? "secondary" : member.status === "suspended" ? "destructive" : "outline"}>
                        {memberStatusLabel(member.status, t)}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingMemberId(member.id)}>
                          {t("companyAccess.edit", { defaultValue: "Edit" })}
                        </Button>
                        <span
                          className="inline-flex"
                          title={!canArchive ? removalReason ?? undefined : undefined}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRemovingMemberId(member.id)}
                            disabled={!canArchive}
                            title={!canArchive ? removalReason ?? undefined : undefined}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            {t("companyAccess.remove", { defaultValue: "Remove" })}
                          </Button>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMemberId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("companyAccess.editMember", { defaultValue: "Edit member" })}</DialogTitle>
            <DialogDescription>
              {t("companyAccess.editMemberDescription", {
                defaultValue: "Update company role and membership status for {{name}}.",
                name: editingMember?.user?.name || editingMember?.user?.email || editingMember?.principalId,
              })}
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">{t("companyAccess.companyRole", { defaultValue: "Company role" })}</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={draftRole ?? ""}
                    onChange={(event) =>
                      setDraftRole((event.target.value || null) as CompanyMember["membershipRole"])
                    }
                  >
                    <option value="">{t("companyAccess.unset", { defaultValue: "Unset" })}</option>
                    {Object.entries(HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {memberRoleLabel(value as keyof typeof HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS, t, label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">{t("companyAccess.membershipStatus", { defaultValue: "Membership status" })}</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={draftStatus}
                    onChange={(event) =>
                      setDraftStatus(event.target.value as EditableMemberStatus)
                    }
                  >
                    <option value="active">{t("companyAccess.statusActive", { defaultValue: "Active" })}</option>
                    <option value="pending">{t("companyAccess.statusPending", { defaultValue: "Pending" })}</option>
                    <option value="suspended">{t("companyAccess.statusSuspended", { defaultValue: "Suspended" })}</option>
                  </select>
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMemberId(null)}>
              {t("companyAccess.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              onClick={() => {
                if (!editingMember) return;
                updateMemberMutation.mutate({
                  memberId: editingMember.id,
                  membershipRole: draftRole,
                  status: draftStatus,
                });
              }}
              disabled={updateMemberMutation.isPending}
            >
              {updateMemberMutation.isPending
                ? t("companyAccess.saving", { defaultValue: "Saving…" })
                : t("companyAccess.saveMember", { defaultValue: "Save member" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMemberId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("companyAccess.removeMember", { defaultValue: "Remove member" })}</DialogTitle>
            <DialogDescription>
              {t("companyAccess.removeMemberDescription", {
                defaultValue: "Archive {{name}} and move active assignments before hiding this user from assignment fields.",
                name: memberDisplayName(removingMember),
              })}
            </DialogDescription>
          </DialogHeader>
          {removingMember && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border px-3 py-3">
                <div className="text-sm font-medium">{memberDisplayName(removingMember)}</div>
                <div className="text-sm text-muted-foreground">{removingMember.user?.email || removingMember.principalId}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {assignedIssuesQuery.isLoading
                    ? t("companyAccess.checkingAssignedTasks", { defaultValue: "Checking assigned tasks…" })
                    : t("companyAccess.assignedTasks", {
                        defaultValue: "{{count}} open assigned tasks",
                        count: assignedIssues.length,
                      })}
                </div>
              </div>

              {assignedIssues.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("companyAccess.taskReassignment", { defaultValue: "Task reassignment" })}</div>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={reassignmentTarget}
                    onChange={(event) => setReassignmentTarget(event.target.value)}
                  >
                    <option value="__unassigned">{t("companyAccess.leaveUnassigned", { defaultValue: "Leave unassigned" })}</option>
                    {activeReassignmentUsers.length > 0 ? (
                      <optgroup label={t("companyAccess.humans", { defaultValue: "Humans" })}>
                        {activeReassignmentUsers.map((member) => (
                          <option key={member.id} value={`user:${member.principalId}`}>
                            {memberDisplayName(member)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {activeReassignmentAgents.length > 0 ? (
                      <optgroup label={t("companyAccess.agents", { defaultValue: "Agents" })}>
                        {activeReassignmentAgents.map((agent) => (
                          <option key={agent.id} value={`agent:${agent.id}`}>
                            {agent.name} ({agent.role})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                  <div className="max-h-36 overflow-auto rounded-lg border border-border">
                    {assignedIssues.slice(0, 6).map((issue) => (
                      <div key={issue.id} className="border-b border-border px-3 py-2 text-sm last:border-b-0">
                        <div className="font-medium">{issue.identifier ?? issue.id.slice(0, 8)}</div>
                        <div className="truncate text-muted-foreground">{issue.title}</div>
                      </div>
                    ))}
                    {assignedIssues.length > 6 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t("companyAccess.moreTasks", {
                          defaultValue: "{{count}} more tasks",
                          count: assignedIssues.length - 6,
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMemberId(null)}>
              {t("companyAccess.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removingMember) return;
                archiveMemberMutation.mutate({
                  memberId: removingMember.id,
                  target: reassignmentTarget,
                });
              }}
              disabled={archiveMemberMutation.isPending || assignedIssuesQuery.isLoading}
            >
              {archiveMemberMutation.isPending
                ? t("companyAccess.removing", { defaultValue: "Removing…" })
                : t("companyAccess.removeMember", { defaultValue: "Remove member" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CompanyAccessLegacyRoute() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { slots, isLoading, errorMessage } = usePluginSlots({
    slotTypes: ["companySettingsPage"],
    companyId: selectedCompanyId,
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: t("companyAccess.settings", { defaultValue: "Settings" }), href: "/company/settings" },
      { label: t("companyAccess.access", { defaultValue: "Access" }) },
    ]);
  }, [setBreadcrumbs, t]);

  const permissionsSlot = slots.find((slot) => slot.routePath === "permissions");
  if (permissionsSlot) {
    return <Navigate to="/company/settings/permissions" replace />;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("companyAccess.checkingAdvancedPermissionExtensions", { defaultValue: "Checking for advanced permission extensions…" })}</div>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("companyAccess.advancedPermissions", { defaultValue: "Advanced Permissions" })}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("companyAccess.advancedAccessDescription", {
            defaultValue: "Advanced access, scoped assignment, and explicit grant controls are provided by installed company settings extensions.",
          })}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border px-5 py-5">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t("companyAccess.advancedPermissionsUnavailable", { defaultValue: "Advanced permissions unavailable" })}</h2>
          <p className="text-sm text-muted-foreground">
            {t("companyAccess.corePermissionDescription", {
              defaultValue: "Core Paperclip keeps enforcing company boundaries and any existing restrictive policy data, but editing advanced permissions requires an installed extension.",
            })}
          </p>
          {errorMessage ? (
            <p className="text-sm text-destructive">
              {t("companyAccess.pluginExtensionsUnavailable", {
                defaultValue: "Plugin extensions unavailable: {{message}}",
                message: errorMessage,
              })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/company/settings/members">{t("companyAccess.openMembers", { defaultValue: "Open Members" })}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/company/settings/invites">{t("companyAccess.openInvites", { defaultValue: "Open Invites" })}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function memberDisplayName(member: CompanyMember | null, fallback = "this member") {
  if (!member) return fallback;
  return member.user?.name?.trim() || member.user?.email || member.principalId;
}

function memberRoleLabel(
  role: keyof typeof HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS,
  translate: ReturnType<typeof useTranslation>["t"],
  fallback = HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS[role],
) {
  const keyByRole = {
    owner: "roleOwner",
    admin: "roleAdmin",
    operator: "roleOperator",
    viewer: "roleViewer",
  } as const;
  return translate(`companyAccess.${keyByRole[role]}`, { defaultValue: fallback });
}

function memberStatusLabel(status: CompanyMember["status"], translate: ReturnType<typeof useTranslation>["t"]) {
  const keyByStatus = {
    active: "statusActive",
    pending: "statusPending",
    suspended: "statusSuspended",
  } as const;
  const key = keyByStatus[status as keyof typeof keyByStatus];
  return key ? translate(`companyAccess.${key}`, { defaultValue: status.replace("_", " ") }) : status.replace("_", " ");
}

function memberInitials(member: CompanyMember) {
  const value = memberDisplayName(member).trim();
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
}

function isAssignableAgent(agent: Agent) {
  return agent.status !== "terminated" && agent.status !== "pending_approval";
}

function isEditableMemberStatus(status: CompanyMember["status"]): status is EditableMemberStatus {
  return status === "pending" || status === "active" || status === "suspended";
}

function PendingJoinRequestCard({
  title,
  subtitle,
  context,
  detail,
  detailSecondary,
  approveLabel,
  rejectLabel,
  disabled,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  context: string;
  detail: string;
  detailSecondary?: string;
  approveLabel: string;
  rejectLabel: string;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          </div>
          <div className="text-sm text-muted-foreground">{context}</div>
          <div className="text-sm text-muted-foreground">{detail}</div>
          {detailSecondary ? <div className="text-sm text-muted-foreground">{detailSecondary}</div> : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onReject} disabled={disabled}>
            {rejectLabel}
          </Button>
          <Button type="button" onClick={onApprove} disabled={disabled}>
            {approveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
