import { AlertTriangle } from "lucide-react";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/i18n";

export type ProfileActionDialogKind = "archive" | "delete" | "restore";

export function ProfileActionDialog({
  kind,
  profile,
  pending,
  onClose,
  onArchive,
  onRestore,
  onDelete,
}: {
  kind: ProfileActionDialogKind | null;
  profile: ToolProfileWithDetails | null;
  pending: boolean;
  onClose: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  if (!kind || !profile) return null;

  const defaultDeleteBlocked = kind === "delete" && profile.summary.isCompanyDefault;
  const copy = {
    archive: {
      title: t("toolsPage.profiles.actionDialog.archiveTitle", { defaultValue: "Archive profile" }),
      body: t(profile.summary.appliesToAgentCount === 1 ? "toolsPage.profiles.actionDialog.archiveBodySingular" : "toolsPage.profiles.actionDialog.archiveBody", {
        defaultValue: profile.summary.appliesToAgentCount === 1
          ? "This profile stops applying to {{count}} agent. You can restore it later."
          : "This profile stops applying to {{count}} agents. You can restore it later.",
        count: profile.summary.appliesToAgentCount,
      }),
      confirm: t("toolsPage.profiles.archive", { defaultValue: "Archive" }),
      action: onArchive,
    },
    restore: {
      title: t("toolsPage.profiles.actionDialog.restoreTitle", { defaultValue: "Restore profile" }),
      body: t("toolsPage.profiles.actionDialog.restoreBody", { defaultValue: "This profile will be active again and can be assigned to agents." }),
      confirm: t("toolsPage.profiles.restore", { defaultValue: "Restore" }),
      action: onRestore,
    },
    delete: {
      title: t("toolsPage.profiles.actionDialog.deleteTitle", { defaultValue: "Delete profile" }),
      body: defaultDeleteBlocked
        ? t("toolsPage.profiles.actionDialog.deleteDefaultBody", { defaultValue: "This profile is the company default. Reassign the company default to another profile before deleting it." })
        : t(profile.summary.assignmentCount === 1 ? "toolsPage.profiles.actionDialog.deleteBodySingular" : "toolsPage.profiles.actionDialog.deleteBody", {
            defaultValue: profile.summary.assignmentCount === 1
              ? "This permanently deletes the profile and removes {{count}} assignment."
              : "This permanently deletes the profile and removes {{count}} assignments.",
            count: profile.summary.assignmentCount,
          }),
      confirm: t("toolsPage.profiles.delete", { defaultValue: "Delete" }),
      action: onDelete,
    },
  }[kind];

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        {defaultDeleteBlocked ? (
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("toolsPage.profiles.actionDialog.deleteDefaultHint", { defaultValue: "Choose another access profile and make it the company default first." })}</span>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("toolsPage.profiles.cancel", { defaultValue: "Cancel" })}</Button>
          <Button
            variant={kind === "delete" ? "destructive" : "default"}
            disabled={pending || defaultDeleteBlocked}
            onClick={copy.action}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
