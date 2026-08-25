import { useMemo } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useTranslation } from "@/i18n";
import {
  buildReusableExecutionWorkspaceOptionGroups,
  reusableWorkspaceOptionMatches,
  scoreReusableWorkspaceOptionMatch,
  type ReusableExecutionWorkspaceLike,
  type ReusableWorkspaceOption,
} from "@/lib/reusable-execution-workspaces";
import { cn } from "@/lib/utils";

const COMPACT_TRIGGER_CLASS = "h-8 px-2 py-1.5 text-xs font-normal";

interface ReusableExecutionWorkspaceSelectProps<TWorkspace extends ReusableExecutionWorkspaceLike> {
  value: string;
  workspaces: readonly TWorkspace[];
  onValueChange: (workspaceId: string, option: ReusableWorkspaceOption<TWorkspace>) => void;
  placeholder?: string;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  disablePortal?: boolean;
}

export function ReusableExecutionWorkspaceSelect<TWorkspace extends ReusableExecutionWorkspaceLike>({
  value,
  workspaces,
  onValueChange,
  placeholder,
  loading = false,
  error = false,
  disabled = false,
  className,
  triggerClassName,
  disablePortal,
}: ReusableExecutionWorkspaceSelectProps<TWorkspace>) {
  const { t } = useTranslation();
  const groups = useMemo(() => buildReusableExecutionWorkspaceOptionGroups(workspaces), [workspaces]);

  return (
    <SearchableSelect<string, ReusableWorkspaceOption<TWorkspace>>
      value={value}
      groups={groups}
      onValueChange={onValueChange}
      placeholder={placeholder ?? t("newIssueDialog.chooseWorkspace", { defaultValue: "Choose an existing workspace" })}
      searchPlaceholder={t("newIssueDialog.searchWorkspaces", { defaultValue: "Search workspaces..." })}
      emptyMessage={error
        ? t("newIssueDialog.workspacesFailedToLoad", { defaultValue: "Workspaces failed to load." })
        : t("newIssueDialog.noMatchingWorkspaces", { defaultValue: "No matching workspaces." })}
      loadingMessage={t("newIssueDialog.loadingWorkspaces", { defaultValue: "Loading workspaces..." })}
      loading={loading}
      disabled={disabled}
      className={className}
      triggerClassName={cn(COMPACT_TRIGGER_CLASS, triggerClassName)}
      filterOption={reusableWorkspaceOptionMatches}
      scoreOption={scoreReusableWorkspaceOptionMatch}
      disablePortal={disablePortal}
      renderOption={(option, { selected }) => (
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate", selected && "font-medium")}>{option.label}</span>
          <span className="truncate text-(length:--text-micro) text-muted-foreground">
            {option.workspace.status
              ? `${t(`issueWorkspaceCard.status.${option.workspace.status}`, {
                defaultValue: option.workspace.status,
              })} - `
              : ""}
            {option.description}
          </span>
        </span>
      )}
    />
  );
}
