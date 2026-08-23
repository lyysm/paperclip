import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";

interface ShortcutEntry {
  keys: string[];
  /** Catalog key; `label` doubles as the English defaultValue. */
  labelKey: string;
  label: string;
  /** Render keys as a simultaneous chord (joined with "+") rather than a
   *  "then" sequence. */
  combo?: boolean;
}

// Platform-appropriate label for the Cmd/Ctrl modifier so the cheatsheet shows
// the same key the user actually presses (re-pointed in the collapsible sidebar
// work — Cmd/Ctrl+B toggles the rail).
function getPlatformLabel() {
  if (typeof navigator === "undefined") return "";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return nav.userAgentData?.platform || navigator.userAgent || "";
}

const META_KEY = /Mac|iPhone|iPad|iPod/.test(getPlatformLabel()) ? "⌘" : "Ctrl";

interface ShortcutSection {
  titleKey: string;
  title: string;
  shortcuts: ShortcutEntry[];
}

const sections: ShortcutSection[] = [
  {
    titleKey: "nav.inbox",
    title: "Inbox",
    shortcuts: [
      { keys: ["j"], labelKey: "shortcuts.moveDown", label: "Move down" },
      { keys: ["↓"], labelKey: "shortcuts.moveDown", label: "Move down" },
      { keys: ["k"], labelKey: "shortcuts.moveUp", label: "Move up" },
      { keys: ["↑"], labelKey: "shortcuts.moveUp", label: "Move up" },
      { keys: ["←"], labelKey: "shortcuts.collapseGroup", label: "Collapse selected group" },
      { keys: ["→"], labelKey: "shortcuts.expandGroup", label: "Expand selected group" },
      { keys: ["Enter"], labelKey: "shortcuts.openSelectedItem", label: "Open selected item" },
      { keys: ["a"], labelKey: "shortcuts.archiveItem", label: "Archive item" },
      { keys: ["y"], labelKey: "shortcuts.archiveItem", label: "Archive item" },
      { keys: ["r"], labelKey: "shortcuts.markAsRead", label: "Mark as read" },
      { keys: ["U"], labelKey: "shortcuts.markAsUnread", label: "Mark as unread" },
    ],
  },
  {
    titleKey: "shortcuts.taskDetailSection",
    title: "Task detail",
    shortcuts: [
      { keys: ["y"], labelKey: "shortcuts.quickArchive", label: "Quick-archive back to inbox" },
      { keys: ["g", "i"], labelKey: "shortcuts.goToInbox", label: "Go to inbox" },
      { keys: ["g", "c"], labelKey: "shortcuts.focusComment", label: "Focus comment composer" },
    ],
  },
  {
    titleKey: "nav.decisions",
    title: "Decisions",
    shortcuts: [
      { keys: ["j"], labelKey: "shortcuts.moveDown", label: "Move down" },
      { keys: ["↓"], labelKey: "shortcuts.moveDown", label: "Move down" },
      { keys: ["k"], labelKey: "shortcuts.moveUp", label: "Move up" },
      { keys: ["↑"], labelKey: "shortcuts.moveUp", label: "Move up" },
      { keys: ["Enter"], labelKey: "shortcuts.openOrCloseDecision", label: "Open or close selected decision" },
      { keys: ["x"], labelKey: "shortcuts.dismissDecision", label: "Dismiss selected decision" },
    ],
  },
  {
    titleKey: "shortcuts.globalSection",
    title: "Global",
    shortcuts: [
      { keys: ["/"], labelKey: "shortcuts.searchCurrentPage", label: "Search current page or quick search" },
      { keys: ["c"], labelKey: "shortcuts.newTask", label: "New task" },
      { keys: ["["], labelKey: "shortcuts.toggleSidebar", label: "Toggle sidebar" },
      { keys: [META_KEY, "B"], labelKey: "shortcuts.collapseOrExpandSidebar", label: "Collapse or expand sidebar", combo: true },
      { keys: ["]"], labelKey: "shortcuts.togglePanel", label: "Toggle panel" },
      { keys: ["?"], labelKey: "shortcuts.showCheatsheet", label: "Show keyboard shortcuts" },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-foreground shadow-(--shadow-extract-10)">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsCheatsheetContent() {
  const { t } = useTranslation();
  return (
    <>
      <div className="divide-y divide-border border-t border-border">
        {sections.map((section) => (
          <div key={section.titleKey} className="px-5 py-3">
            <h3 className="mb-2 text-(length:--text-micro) font-semibold uppercase tracking-wider text-muted-foreground">
              {t(section.titleKey, { defaultValue: section.title })}
            </h3>
            <div className="space-y-1.5">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.labelKey + shortcut.keys.join()}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-foreground/90">
                    {t(shortcut.labelKey, { defaultValue: shortcut.label })}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {shortcut.combo
                              ? "+"
                              : t("shortcuts.then", { defaultValue: "then" })}
                          </span>
                        )}
                        <KeyCap>{key}</KeyCap>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          {t("shortcuts.press", { defaultValue: "Press" })} <KeyCap>Esc</KeyCap>{" "}
          {t("shortcuts.toClose", { defaultValue: "to close" })} &middot;{" "}
          {t("shortcuts.disabledInTextFields", { defaultValue: "Shortcuts are disabled in text fields" })}
        </p>
      </div>
    </>
  );
}

export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">
            {t("shortcuts.title", { defaultValue: "Keyboard shortcuts" })}
          </DialogTitle>
        </DialogHeader>
        <KeyboardShortcutsCheatsheetContent />
      </DialogContent>
    </Dialog>
  );
}
