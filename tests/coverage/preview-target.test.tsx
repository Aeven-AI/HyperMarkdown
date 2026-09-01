// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import HyperMarkdown from "../../index";
import { openHtmlWindow } from "../../lib/runtime";

let frames: FrameRequestCallback[] = [];

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = (() => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as any;
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  }) as any;
  HTMLElement.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  document.body.replaceChildren();
  frames = [];
  vi.restoreAllMocks();
  localStorage.clear();
});

function flushFrames() {
  const pending = frames;
  frames = [];
  pending.forEach((frame) => act(() => frame(0)));
}

function mount(ui: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  flushFrames();
  return { host, root };
}

const md = "```html\n<strong>preview</strong>\n```\n";

/** The preview button, which sits first on a settled HTML block's toolbar. */
function previewButton(host: HTMLElement) {
  return host.querySelectorAll<HTMLButtonElement>(".codeblock-icon-button")[0]!;
}

describe("the built-in preview", () => {
  it("opens the html as a page of its own, with nothing configured", () => {
    // jsdom has no blob URLs; the default needs one, so stand it in.
    const created = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:http://localhost/preview");
    const revoked = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const opened = vi
      .spyOn(window, "open")
      .mockImplementation(() => ({}) as Window);
    const alerts = vi.fn();

    const { host, root } = mount(<HyperMarkdown md={md} onAlert={alerts} />);
    act(() => previewButton(host).click());

    expect(created).toHaveBeenCalledOnce();
    expect(created.mock.calls[0]![0]).toBeInstanceOf(Blob);
    expect((created.mock.calls[0]![0] as Blob).type).toBe("text/html");
    expect(opened).toHaveBeenCalledWith("blob:http://localhost/preview", "_blank");

    // Revoking is what would break the reload the reader is about to do.
    expect(revoked).not.toHaveBeenCalled();
    // Nothing was handed off, so nothing was left behind in storage either.
    expect(Object.keys(localStorage)).toHaveLength(0);
    expect(alerts).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("says so when no window can be had", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/x");
    const revoked = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(window, "open").mockImplementation(() => null);
    const alerts = vi.fn();

    const { host, root } = mount(<HyperMarkdown md={md} onAlert={alerts} />);
    act(() => previewButton(host).click());

    expect(alerts).toHaveBeenCalledOnce();
    expect(alerts.mock.calls[0]![0].header).toBe("Code unavailable");
    // Nothing is going to read that blob now.
    expect(revoked).toHaveBeenCalledWith("blob:http://localhost/x");

    act(() => root.unmount());
  });
});

describe("a preview the host serves", () => {
  it("stores the html and opens the host's page", () => {
    const opened = vi.spyOn(window, "open").mockImplementation(() => null);
    const created = vi.spyOn(URL, "createObjectURL");
    const alerts = vi.fn();

    const { host, root } = mount(
      <HyperMarkdown
        md={md}
        onAlert={alerts}
        preview={{ url: "/p/{id}?x=1", storageKey: "html-{id}" }}
      />,
    );
    act(() => previewButton(host).click());

    const url = opened.mock.calls[0]![0] as string;
    expect(url).toMatch(/^\/p\/hm-.+\?x=1$/);

    const key = Object.keys(localStorage)[0]!;
    expect(key).toMatch(/^html-hm-/);
    expect(localStorage.getItem(key)).toBe("<strong>preview</strong>\n");

    // Handing off means no blob is made, and no alert: the page is the host's
    // to open, and a blocked window is the host's to notice.
    expect(created).not.toHaveBeenCalled();
    expect(alerts).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("takes functions where a route needs more than substitution", () => {
    const opened = vi.spyOn(window, "open").mockImplementation(() => null);

    const { host, root } = mount(
      <HyperMarkdown
        md={md}
        preview={{
          url: (id) => `/preview#${encodeURIComponent(id)}`,
          storageKey: (id) => `k:${id}`,
        }}
      />,
    );
    act(() => previewButton(host).click());

    expect(opened.mock.calls[0]![0]).toMatch(/^\/preview#hm-/);
    expect(Object.keys(localStorage)[0]).toMatch(/^k:hm-/);

    act(() => root.unmount());
  });
});

describe("openHtmlWindow", () => {
  it("reports failure rather than throwing when blobs are unavailable", () => {
    const create = URL.createObjectURL;

    // Some hosts have no blob URLs at all.
    (URL as any).createObjectURL = undefined;
    expect(openHtmlWindow("<p>x</p>")).toBe(false);

    // Others have one that refuses.
    (URL as any).createObjectURL = () => {
      throw new Error("denied");
    };
    expect(openHtmlWindow("<p>x</p>")).toBe(false);

    (URL as any).createObjectURL = create;
  });
});
