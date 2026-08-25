import { useState } from "react";
import { Apple, Monitor, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

type Platform = "mac" | "windows" | "linux";

const platforms: { id: Platform; labelKey: string; label: string; icon: typeof Apple }[] = [
  { id: "mac", labelKey: "agentConfig.pathInstructions.platformMac", label: "macOS", icon: Apple },
  { id: "windows", labelKey: "agentConfig.pathInstructions.platformWindows", label: "Windows", icon: Monitor },
  { id: "linux", labelKey: "agentConfig.pathInstructions.platformLinux", label: "Linux", icon: Terminal },
];

const instructionKeys: Record<Platform, { steps: string[]; tip: string }> = {
  mac: {
    steps: [
      "agentConfig.pathInstructions.mac.step1",
      "agentConfig.pathInstructions.mac.step2",
      "agentConfig.pathInstructions.mac.step3",
      "agentConfig.pathInstructions.mac.step4",
    ],
    tip: "agentConfig.pathInstructions.mac.tip",
  },
  windows: {
    steps: [
      "agentConfig.pathInstructions.windows.step1",
      "agentConfig.pathInstructions.windows.step2",
      "agentConfig.pathInstructions.windows.step3",
    ],
    tip: "agentConfig.pathInstructions.windows.tip",
  },
  linux: {
    steps: [
      "agentConfig.pathInstructions.linux.step1",
      "agentConfig.pathInstructions.linux.step2",
      "agentConfig.pathInstructions.linux.step3",
    ],
    tip: "agentConfig.pathInstructions.linux.tip",
  },
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
}

interface PathInstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PathInstructionsModal({
  open,
  onOpenChange,
}: PathInstructionsModalProps) {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<Platform>(detectPlatform);

  const current = instructionKeys[platform];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t("agentConfig.pathInstructions.title", { defaultValue: "How to get a full path" })}
          </DialogTitle>
          <DialogDescription>
            {t("agentConfig.pathInstructions.descriptionBefore", { defaultValue: "Paste the absolute path (e.g." })}{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/Users/you/project</code>
            {t("agentConfig.pathInstructions.descriptionAfter", { defaultValue: ") into the input field." })}
          </DialogDescription>
        </DialogHeader>

        {/* Platform tabs */}
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                platform === p.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
              onClick={() => setPlatform(p.id)}
            >
              <p.icon className="h-3.5 w-3.5" />
              {t(p.labelKey, { defaultValue: p.label })}
            </button>
          ))}
        </div>

        {/* Steps */}
        <ol className="space-y-2 text-sm">
          {current.steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground font-mono text-xs mt-0.5 shrink-0">
                {i + 1}.
              </span>
              <span>{t(step)}</span>
            </li>
          ))}
        </ol>

        {current.tip && (
          <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
            {t(current.tip)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Small "Choose" button that opens the PathInstructionsModal.
 * Drop-in replacement for the old showDirectoryPicker buttons.
 */
export function ChoosePathButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {t("agentConfig.pathInstructions.choose", { defaultValue: "Choose" })}
      </button>
      <PathInstructionsModal open={open} onOpenChange={setOpen} />
    </>
  );
}
