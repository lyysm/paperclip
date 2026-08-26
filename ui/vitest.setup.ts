const storageEntries = new Map<string, string>();

function installStorageMock(target: Record<string, unknown>) {
  Object.defineProperty(target, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageEntries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageEntries.set(key, String(value));
      },
      removeItem: (key: string) => {
        storageEntries.delete(key);
      },
      clear: () => {
        storageEntries.clear();
      },
    },
  });
}

// Do not probe `globalThis.localStorage` here. Node 24 exposes a native
// localStorage getter that emits a warning when no valid --localstorage-file
// is configured. The tests already use a deterministic in-memory store, so
// install it directly in both Node and jsdom environments.
installStorageMock(globalThis);
if (typeof window !== "undefined") {
  installStorageMock(window as unknown as Record<string, unknown>);
}

// jsdom does not implement Element.prototype.scrollIntoView. Several surfaces
// (e.g. IssueChatThread's auto-scroll-to-latest) call it during normal render,
// so provide a no-op default. Tests that assert on scroll behaviour override
// this on the prototype themselves and restore it afterwards.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
