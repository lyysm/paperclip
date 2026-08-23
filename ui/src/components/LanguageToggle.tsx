import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setLocale, useTranslation } from "../i18n";
import {
  DEFAULT_LOCALE,
  isSelectableLocale,
  LOCALE_DISPLAY_NAMES,
  SELECTABLE_LOCALES,
  type SelectableLocale,
} from "../i18n/locales";

type LanguageToggleVariant = "icon" | "menu-action";

interface LanguageToggleProps {
  className?: string;
  /**
   * `icon` (default): compact icon button — suitable for headers and
   * floating chrome (e.g. the unauthenticated `/auth` page).
   *
   * `menu-action`: full-width row with label + description + icon —
   * matches the surrounding `MenuAction` rows in `SidebarAccountMenu`.
   */
  variant?: LanguageToggleVariant;
  /**
   * Called after the locale switch runs. Surfaces like a popover menu use
   * this to dismiss the menu once the user has acted.
   */
  onAfterChange?: () => void;
}

function activeLocale(language: string | null | undefined): SelectableLocale {
  return isSelectableLocale(language) ? language : DEFAULT_LOCALE;
}

/**
 * Canonical locale-switch widget. Both the signed-out `/auth` chrome and
 * the in-app account menu render through this component so the labels stay
 * in sync as the selectable locale list grows. Options are labelled with
 * native endonyms so they read correctly in any active locale; with more
 * than two selectable locales this should become a picker instead of a
 * cycle.
 */
export function LanguageToggle({ className, variant = "icon", onAfterChange }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const current = activeLocale(i18n.resolvedLanguage ?? i18n.language);
  const nextIndex = (SELECTABLE_LOCALES.indexOf(current) + 1) % SELECTABLE_LOCALES.length;
  const next = SELECTABLE_LOCALES[nextIndex] ?? DEFAULT_LOCALE;
  const label = `Switch to ${LOCALE_DISPLAY_NAMES[next]}`;
  const description = `Language: ${LOCALE_DISPLAY_NAMES[current]}`;

  function handleClick() {
    void setLocale(next);
    onAfterChange?.();
  }

  if (variant === "menu-action") {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/60",
          className,
        )}
        onClick={handleClick}
        aria-label={label}
      >
        <span className="mt-0.5 rounded-lg border border-border bg-background/70 p-2 text-muted-foreground">
          <Languages className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={cn("text-muted-foreground", className)}
    >
      <Languages />
    </Button>
  );
}
