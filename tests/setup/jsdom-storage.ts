/**
 * Node exposes an experimental `localStorage`/`sessionStorage` global that
 * yields `undefined` unless the process is started with `--localstorage-file`.
 * Those globals shadow the jsdom implementations vitest installs, so any test
 * touching storage sees `undefined` instead of a Storage object. jsdom keeps
 * the real wrappers on the window, so point the globals back at them.
 *
 * The globals are rebound without ever being read: merely touching Node's
 * getter emits an ExperimentalWarning, and jsdom's wrapper is the correct
 * target either way.
 */
const storages = ["localStorage", "sessionStorage"] as const;

if (typeof window !== "undefined") {
  for (const name of storages) {
    const jsdomStorage = (window as unknown as Record<string, unknown>)[
      "_" + name
    ];

    if (jsdomStorage) {
      Object.defineProperty(window, name, {
        configurable: true,
        get: () => jsdomStorage,
      });
    }
  }
}
