// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageToggle } from "./LanguageToggle";

const mockSetLocale = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockI18n = vi.hoisted(() => ({ resolvedLanguage: "en" as string | null | undefined }));

vi.mock("../i18n", () => ({
  useTranslation: () => ({
    i18n: mockI18n,
    // Minimal t(): defaultValue with {{name}} interpolation, mirroring the
    // English fallback path the component relies on.
    t: (key: string, options?: { defaultValue?: string } & Record<string, unknown>) => {
      let value = options?.defaultValue ?? key;
      for (const [name, replacement] of Object.entries(options ?? {})) {
        if (name === "defaultValue") continue;
        value = value.replaceAll(`{{${name}}}`, String(replacement));
      }
      return value;
    },
  }),
  setLocale: mockSetLocale,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("LanguageToggle", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockI18n.resolvedLanguage = "en";
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders an icon button by default offering Chinese while English is active", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<LanguageToggle />);
    });
    await flushReact();

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Switch to 简体中文");
    expect(button?.getAttribute("title")).toBe("Switch to 简体中文");

    await act(async () => root.unmount());
  });

  it("switches to the next locale and notifies the caller on click", async () => {
    const onAfterChange = vi.fn();
    const root = createRoot(container);
    await act(async () => {
      root.render(<LanguageToggle onAfterChange={onAfterChange} />);
    });
    await flushReact();

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(mockSetLocale).toHaveBeenCalledWith("zh-CN");
    expect(onAfterChange).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });

  it("renders a menu-action row with the action label and current language", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<LanguageToggle variant="menu-action" />);
    });
    await flushReact();

    expect(container.textContent).toContain("Switch to 简体中文");
    expect(container.textContent).toContain("Language: English");

    await act(async () => root.unmount());
  });

  it("flips the label when Chinese is active", async () => {
    mockI18n.resolvedLanguage = "zh-CN";
    const root = createRoot(container);
    await act(async () => {
      root.render(<LanguageToggle variant="menu-action" />);
    });
    await flushReact();

    expect(container.textContent).toContain("Switch to English");
    expect(container.textContent).toContain("Language: 简体中文");

    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(mockSetLocale).toHaveBeenCalledWith("en");

    await act(async () => root.unmount());
  });

  it("falls back to English when the resolved language is not selectable", async () => {
    mockI18n.resolvedLanguage = "fr";
    const root = createRoot(container);
    await act(async () => {
      root.render(<LanguageToggle />);
    });
    await flushReact();

    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-label")).toBe("Switch to 简体中文");

    await act(async () => root.unmount());
  });
});
