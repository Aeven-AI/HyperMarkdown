// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { preloadFonts } from "../../example/font-preloader.js";

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");

afterEach(() => {
  vi.useRealTimers();

  if (originalFonts) {
    Object.defineProperty(document, "fonts", originalFonts);
  } else {
    delete document.fonts;
  }
});

describe("example font preloader", () => {
  it("continues immediately when the Font Loading API is unavailable", () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: undefined,
    });

    return expect(preloadFonts()).resolves.toBeUndefined();
  });

  it("loads every critical Geist and KaTeX face", () => {
    const load = vi.fn(() => Promise.resolve([]));

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load: load },
    });

    return preloadFonts().then(() => {
      expect(load).toHaveBeenCalledTimes(7);
      expect(load).toHaveBeenCalledWith('450 16px "Geist"');
      expect(load).toHaveBeenCalledWith('400 20.5px "KaTeX_Main"');
    });
  });

  it("continues after the timeout when a font request stalls", () => {
    let completed;

    const load = vi.fn(() => new Promise(() => {}));

    vi.useFakeTimers();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load: load },
    });

    completed = false;
    preloadFonts().then(() => {
      completed = true;
    });

    return vi.advanceTimersByTimeAsync(3000).then(() => {
      expect(completed).toBe(true);
    });
  });
});
