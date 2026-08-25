import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, MoreHorizontal, Plus, ShieldCheck, Users } from "lucide-react";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { useNavigate } from "@/lib/router";
import { toolsApi } from "@/api/tools";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/context/ToastContext";
import { t } from "@/i18n";
import { EffectiveAgentPanel } from "../ProfilesTab";
import { ErrorState, LoadingState, RelativeTime, ToolsPageHeader } from "../shared";
import { ProfileActionDialog, type ProfileActionDialogKind } from "./ProfileActionDialog";
import { TEMPLATES, type TemplateKey } from "./profile-model";
import { useProfilesData } from "./useProfilesData";
import { allowsLabel, assignedLabel, isDraft, profileStatusLabel } from "./profile-summary";

/** The wizard route for a fresh profile, optionally seeded with a template. */
function newProfileHref(template?: TemplateKey): string {
  return template
    ? `/apps/advanced/profiles/new?template=${encodeURIComponent(template)}`
    : "/apps/advanced/profiles/new";
}

const TEMPLATE_I18N_KEYS: Record<TemplateKey, { title: string; description: string }> = {
  read_only: {
    title: "toolsPage.profiles.templates.readOnlyTitle",
    description: "toolsPage.profiles.templates.readOnlyDescription",
  },
  everyday: {
    title: "toolsPage.profiles.templates.everydayTitle",
    description: "toolsPage.profiles.templates.everydayDescription",
  },
  full_access: {
    title: "toolsPage.profiles.templates.fullAccessTitle",
    description: "toolsPage.profiles.templates.fullAccessDescription",
  },
  scratch: {
    title: "toolsPage.profiles.templates.scratchTitle",
    description: "toolsPage.profiles.templates.scratchDescription",
  },
  copy: {
    title: "toolsPage.profiles.templates.copyTitle",
    description: "toolsPage.profiles.templates.copyDescription",
  },
};

function templateLabel(
  template: (typeof TEMPLATES)[number],
  field: "title" | "description",
): string {
  return t(TEMPLATE_I18N_KEYS[template.key][field], { defaultValue: template[field] });
}

function statusVariant(status: ToolProfileWithDetails["status"]): "default" | "secondary" | "outline" {
  if (status === "active") return "default";
  if (status === "draft") return "secondary";
  return "outline";
}

export function ProfilesIndex({
  companyId,
  initialStatusFilter,
  initialResolverOpen,
}: {
  companyId: string;
  initialStatusFilter?: "active" | "archived";
  initialResolverOpen?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { profiles, agents } = useProfilesData(companyId);
  const [resolverOpen, setResolverOpen] = useState(Boolean(initialResolverOpen));
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">(initialStatusFilter ?? "active");
  const [actionDialog, setActionDialog] = useState<{
    kind: ProfileActionDialogKind;
    profile: ToolProfileWithDetails;
  } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("check") === "1") setResolverOpen(true);
  }, []);

  const agentOptions = useMemo(
    () => (agents.data ?? []).map((a) => ({ id: a.id, name: a.name })),
    [agents.data],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.profiles(companyId) });

  const errorBody = (error: unknown) => String((error as Error)?.message ?? error);

  const duplicate = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) =>
      toolsApi.duplicateProfile(profile.id, { name: t("toolsPage.profiles.copyName", { defaultValue: "{{name}} (copy)", name: profile.name }) }),
    onSuccess: () => {
      pushToast({
        title: t("toolsPage.profiles.toast.duplicated", { defaultValue: "Profile duplicated" }),
        body: t("toolsPage.profiles.toast.duplicatedBody", { defaultValue: "The copy is not assigned to anyone yet." }),
        tone: "success",
      });
      invalidate();
    },
    onError: (error: unknown) =>
      pushToast({ title: t("toolsPage.profiles.toast.duplicateFailed", { defaultValue: "Could not duplicate" }), body: errorBody(error), tone: "error" }),
  });

  const archive = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) =>
      toolsApi.updateProfile(profile.id, { status: "archived" }),
    onSuccess: () => {
      pushToast({ title: t("toolsPage.profiles.toast.archived", { defaultValue: "Profile archived" }), tone: "success" });
      invalidate();
    },
    onError: (error: unknown) => pushToast({ title: t("toolsPage.profiles.toast.archiveFailed", { defaultValue: "Could not archive" }), body: errorBody(error), tone: "error" }),
  });

  const restore = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) =>
      toolsApi.updateProfile(profile.id, { status: "active" }),
    onSuccess: () => {
      pushToast({ title: t("toolsPage.profiles.toast.restored", { defaultValue: "Profile restored" }), tone: "success" });
      invalidate();
    },
    onError: (error: unknown) => pushToast({ title: t("toolsPage.profiles.toast.restoreFailed", { defaultValue: "Could not restore" }), body: errorBody(error), tone: "error" }),
  });

  const remove = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) => toolsApi.deleteProfile(profile.id),
    onSuccess: () => {
      pushToast({ title: t("toolsPage.profiles.toast.deleted", { defaultValue: "Profile deleted" }), tone: "success" });
      invalidate();
    },
    onError: (error: unknown) => pushToast({ title: t("toolsPage.profiles.toast.deleteFailed", { defaultValue: "Could not delete" }), body: errorBody(error), tone: "error" }),
  });

  const header = (
    <ToolsPageHeader
      title={t("toolsPage.profiles.title", { defaultValue: "Access profiles" })}
      description={t("toolsPage.profiles.description", { defaultValue: "Decide which tools your agents can use. Build a profile once, then assign it to the agents that need it." })}
      actions={
        <>
          <Button variant="outline" onClick={() => setResolverOpen(true)}>
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            {t("toolsPage.profiles.checkAccess", { defaultValue: "Check an agent's access" })}
          </Button>
          <Button onClick={() => navigate(newProfileHref())}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("toolsPage.profiles.newProfile", { defaultValue: "New profile" })}
          </Button>
        </>
      }
    />
  );

  const resolverDialog = (
    <Sheet open={resolverOpen} onOpenChange={setResolverOpen}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{t("toolsPage.profiles.checkAccess", { defaultValue: "Check an agent's access" })}</SheetTitle>
          <SheetDescription>
            {t("toolsPage.profiles.checkAccessDescription", { defaultValue: "See exactly which tools an agent can use right now, and which profile allows each one." })}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <EffectiveAgentPanel companyId={companyId} agentOptions={agentOptions} />
        </div>
      </SheetContent>
    </Sheet>
  );

  if (profiles.isLoading) {
    return (
      <div className="space-y-5">
        {header}
        <LoadingState label={t("toolsPage.profiles.loading", { defaultValue: "Loading profiles…" })} />
      </div>
    );
  }
  if (profiles.isError) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState error={profiles.error} onRetry={() => profiles.refetch()} />
      </div>
    );
  }

  const allRows = profiles.data?.profiles ?? [];
  const rows = allRows.filter((p) => (statusFilter === "archived" ? p.status === "archived" : p.status !== "archived"));

  return (
    <div className="space-y-5">
      {header}

      <div className="inline-flex rounded-md border border-border p-0.5">
        {(["active", "archived"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium",
              statusFilter === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {key === "active"
              ? t("toolsPage.profiles.active", { defaultValue: "Active" })
              : t("toolsPage.profiles.archived", { defaultValue: "Archived" })}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        statusFilter === "archived" ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
            {t("toolsPage.profiles.noArchived", { defaultValue: "No archived profiles." })}
          </div>
        ) : (
          <EmptyTemplatePicker onPick={(key) => navigate(newProfileHref(key))} />
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-(--sz-30pct)" />
              <col className="w-(--sz-18pct)" />
              <col className="w-(--sz-24pct)" />
              <col className="w-(--sz-12pct)" />
              <col className="w-(--sz-12pct)" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("toolsPage.profiles.columnProfile", { defaultValue: "Profile" })}</th>
                <th className="px-3 py-2 font-medium">{t("toolsPage.profiles.columnAllows", { defaultValue: "Allows" })}</th>
                <th className="px-3 py-2 font-medium">{t("toolsPage.profiles.columnAssigned", { defaultValue: "Assigned to" })}</th>
                <th className="px-3 py-2 font-medium">{t("toolsPage.profiles.columnStatus", { defaultValue: "Status" })}</th>
                <th className="px-3 py-2 font-medium">{t("toolsPage.profiles.columnUpdated", { defaultValue: "Updated" })}</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((profile) => {
                const assigned = assignedLabel(profile.summary);
                const draft = isDraft(profile);
                const open = () => navigate(draft ? `/apps/advanced/profiles/${profile.id}/edit` : `/apps/advanced/profiles/${profile.id}`);
                return (
                  <tr
                    key={profile.id}
                    className="group h-10 border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="min-w-0 px-3 py-1.5">
                      <button
                        type="button"
                        onClick={open}
                        title={profile.name}
                        className="block w-full truncate text-left font-medium text-foreground hover:underline"
                      >
                        {profile.name}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span>{allowsLabel(profile.summary)}</span>
                        {(profile.newToolsPendingCount ?? 0) > 0 ? (
                          <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200">
                            {t("toolsPage.profiles.newTools", { defaultValue: "{{count}} new", count: profile.newToolsPendingCount })}
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {assigned.unassigned ? (
                        <span className="text-muted-foreground">
                          {assigned.text}
                          <span className="ml-1 text-xs text-muted-foreground/70">{t("toolsPage.profiles.noAccessChange", { defaultValue: "— does not change access" })}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          {profile.summary.isCompanyDefault ? null : (
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {assigned.text}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-2">
                        <Badge variant={statusVariant(profile.status)}>{profileStatusLabel(profile.status)}</Badge>
                        {draft ? (
                          <button
                            type="button"
                            onClick={open}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {t("toolsPage.profiles.resume", { defaultValue: "Resume" })}
                          </button>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <RelativeTime value={profile.updatedAt} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <RowMenu
                        onEdit={open}
                        onDuplicate={() => duplicate.mutate(profile)}
                        onArchive={() => archive.mutate(profile)}
                        onRestore={profile.status === "archived" ? () => setActionDialog({ kind: "restore", profile }) : undefined}
                        onDelete={() => setActionDialog({ kind: "delete", profile })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {resolverDialog}
      <ProfileActionDialog
        kind={actionDialog?.kind ?? null}
        profile={actionDialog?.profile ?? null}
        pending={restore.isPending || remove.isPending}
        onClose={() => setActionDialog(null)}
        onArchive={() => {
          if (!actionDialog) return;
          archive.mutate(actionDialog.profile, { onSuccess: () => setActionDialog(null) });
        }}
        onRestore={() => {
          if (!actionDialog) return;
          restore.mutate(actionDialog.profile, { onSuccess: () => setActionDialog(null) });
        }}
        onDelete={() => {
          if (!actionDialog) return;
          remove.mutate(actionDialog.profile, { onSuccess: () => setActionDialog(null) });
        }}
      />
    </div>
  );
}

function RowMenu({
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("toolsPage.profiles.profileActions", { defaultValue: "Profile actions" })}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>{t("toolsPage.profiles.edit", { defaultValue: "Edit" })}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>{t("toolsPage.profiles.duplicate", { defaultValue: "Duplicate" })}</DropdownMenuItem>
        {onRestore ? (
          <DropdownMenuItem onSelect={onRestore}>
            <ArchiveRestore className="mr-1.5 h-4 w-4" />
            {t("toolsPage.profiles.restore", { defaultValue: "Restore" })}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onArchive}>{t("toolsPage.profiles.archive", { defaultValue: "Archive" })}</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          {t("toolsPage.profiles.delete", { defaultValue: "Delete" })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Empty state (AP2): the same five step-1 template cards the wizard opens with. */
function EmptyTemplatePicker({ onPick }: { onPick: (key: TemplateKey) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6">
      <div className="mb-4 max-w-2xl">
        <h3 className="text-base font-semibold text-foreground">{t("toolsPage.profiles.createFirstTitle", { defaultValue: "Create your first access profile" })}</h3>
        <p className="text-sm text-muted-foreground">
          {t("toolsPage.profiles.createFirstDescription", { defaultValue: "Pick a starting point. You can fine-tune exactly which tools it allows in the next step." })}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.key}
            type="button"
            onClick={() => onPick(template.key)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-md border border-border bg-card px-4 py-3 text-left transition-colors",
              "hover:border-primary hover:bg-primary/5",
            )}
          >
            <span className="text-sm font-medium text-foreground">{templateLabel(template, "title")}</span>
            <span className="text-xs text-muted-foreground">{templateLabel(template, "description")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
