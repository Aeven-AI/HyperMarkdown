// @vitest-environment jsdom
/**
 * The tooltip's lazy tippy loader: tippy is an optional peer imported on the
 * first tooltip, so every arm of that load — the two export shapes, the cached
 * factory, an absent package, and an unmount that beats the import — decides
 * whether a toolbar gets a tooltip or a plain title.
 */
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mount(ui: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  return { host, root };
}

/** Let the loader's dynamic import and its `.then` settle inside act(). */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function fakeInstance() {
  return {
    destroy: vi.fn(),
    setProps: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("tippy.js");
  vi.resetModules();
  document.body.replaceChildren();
});

describe("tooltip tippy loader", () => {
  it("creates through the ES default export and reuses the cached factory", async () => {
    const first = fakeInstance();
    const second = fakeInstance();
    const tippy = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    vi.doMock("tippy.js", () => ({ default: tippy }));

    const { default: Tooltip } = await import("../../lib/tooltip");

    const one = mount(
      <Tooltip content="first">
        <button type="button">a</button>
      </Tooltip>,
    );
    await settle();
    expect(tippy).toHaveBeenCalledTimes(1);
    expect(tippy.mock.calls[0]![1]).toMatchObject({
      content: "first",
      placement: "top",
      trigger: "mouseenter",
    });

    // The second tooltip takes the cached factory, not a second import.
    const two = mount(
      <Tooltip content="second" trigger="manual" placement="bottom">
        <button type="button">b</button>
      </Tooltip>,
    );
    await settle();
    expect(tippy).toHaveBeenCalledTimes(2);
    expect(tippy.mock.calls[1]![1]).toMatchObject({
      content: "second",
      placement: "bottom",
      trigger: "manual",
    });

    act(() => one.root.unmount());
    act(() => two.root.unmount());
    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(second.destroy).toHaveBeenCalledTimes(1);
  });

  it("creates through the nested CommonJS default (Node interop)", async () => {
    const instance = fakeInstance();
    const callable = vi.fn(() => instance);
    // Node wraps the CommonJS `module.exports` object as the ES `default`, and
    // that object carries its own `default` — so the callable is two deep.
    vi.doMock("tippy.js", () => ({
      default: { default: callable, delegate: vi.fn() },
    }));

    const { default: Tooltip } = await import("../../lib/tooltip");
    const { root } = mount(
      <Tooltip content="cjs">
        <button type="button">c</button>
      </Tooltip>,
    );
    await settle();

    expect(callable).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it("renders without a tooltip when the package exports no callable", async () => {
    vi.doMock("tippy.js", () => ({ default: { delegate: vi.fn() } }));

    const { default: Tooltip } = await import("../../lib/tooltip");
    const { host, root } = mount(
      <Tooltip content="uncallable">
        <button type="button">h</button>
      </Tooltip>,
    );
    await settle();

    expect(host.querySelector("button")).not.toBeNull();
    act(() => root.unmount());
  });

  it("stops descending a default chain that never reaches a callable", async () => {
    // Objects all the way down: the descent is bounded rather than unbounded.
    vi.doMock("tippy.js", () => ({ default: { default: { default: {} } } }));

    const { default: Tooltip } = await import("../../lib/tooltip");
    const { host, root } = mount(
      <Tooltip content="deep">
        <button type="button">j</button>
      </Tooltip>,
    );
    await settle();

    expect(host.querySelector("button")).not.toBeNull();
    act(() => root.unmount());
  });

  it("gives up on a namespace whose default chain bottoms out", async () => {
    vi.doMock("tippy.js", () => ({ default: null }));

    const { default: Tooltip } = await import("../../lib/tooltip");
    const { host, root } = mount(
      <Tooltip content="null-default">
        <button type="button">i</button>
      </Tooltip>,
    );
    await settle();

    expect(host.querySelector("button")).not.toBeNull();
    act(() => root.unmount());
  });

  it("renders without a tooltip when tippy cannot be loaded, and retries later", async () => {
    let attempts = 0;
    const instance = fakeInstance();
    vi.doMock("tippy.js", () => {
      attempts += 1;
      if (attempts === 1) throw new Error("not installed");
      return { default: vi.fn(() => instance) };
    });

    const { default: Tooltip } = await import("../../lib/tooltip");

    const failed = mount(
      <Tooltip content="absent">
        <button type="button">d</button>
      </Tooltip>,
    );
    await settle();
    // The button still rendered; nothing threw.
    expect(failed.host.querySelector("button")).not.toBeNull();
    expect(attempts).toBe(1);
    act(() => failed.root.unmount());

    // The failed load cleared its cache, so a later tooltip tries again.
    const retried = mount(
      <Tooltip content="present">
        <button type="button">e</button>
      </Tooltip>,
    );
    await settle();
    expect(attempts).toBe(2);
    act(() => retried.root.unmount());
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it("creates nothing when the tooltip unmounts before tippy resolves", async () => {
    const instance = fakeInstance();
    const tippy = vi.fn(() => instance);
    vi.doMock("tippy.js", () => ({ default: tippy }));

    const { default: Tooltip } = await import("../../lib/tooltip");
    const { root } = mount(
      <Tooltip content="gone">
        <button type="button">f</button>
      </Tooltip>,
    );
    // Unmount in the same tick, before the import's `.then` runs.
    act(() => root.unmount());
    await settle();

    expect(tippy).not.toHaveBeenCalled();
    expect(instance.destroy).not.toHaveBeenCalled();
  });

  it("skips the load entirely when it has no child to anchor to", async () => {
    const tippy = vi.fn(() => fakeInstance());
    vi.doMock("tippy.js", () => ({ default: tippy }));

    const { default: Tooltip } = await import("../../lib/tooltip");
    const { host, root } = mount(<Tooltip content="nothing" />);
    await settle();

    expect(host.firstChild).toBeNull();
    expect(tippy).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it("falls back to defaults at creation and on every prop update", async () => {
    const instance = fakeInstance();
    const tippy = vi.fn(() => instance);
    vi.doMock("tippy.js", () => ({ default: tippy }));

    const { default: Tooltip } = await import("../../lib/tooltip");

    // Every optional prop omitted: creation takes the whole default set.
    const { root } = mount(
      <Tooltip>
        <button type="button">k</button>
      </Tooltip>,
    );
    await settle();
    expect(tippy.mock.calls[0]![1]).toMatchObject({
      content: "",
      placement: "top",
      touch: true,
      arrow: true,
      trigger: "mouseenter",
    });

    // A prop change re-runs setProps with values supplied…
    act(() => {
      root.render(
        <Tooltip
          content="named"
          placement="left"
          touch={false}
          arrow={false}
          trigger="click"
        >
          <button type="button">k</button>
        </Tooltip>,
      );
    });
    expect(instance.setProps).toHaveBeenLastCalledWith({
      content: "named",
      placement: "left",
      touch: false,
      arrow: false,
      trigger: "click",
    });

    // …and again with them withdrawn, taking the same defaults.
    act(() => {
      root.render(
        <Tooltip>
          <button type="button">k</button>
        </Tooltip>,
      );
    });
    expect(instance.setProps).toHaveBeenLastCalledWith({
      content: "",
      placement: "top",
      touch: true,
      arrow: true,
      trigger: "mouseenter",
    });

    // Manual trigger wins over the default on the update path too.
    act(() => {
      root.render(
        <Tooltip trigger="manual">
          <button type="button">k</button>
        </Tooltip>,
      );
    });
    expect(instance.setProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ trigger: "manual" }),
    );

    act(() => root.unmount());
  });

  it("forwards show and hide to the instance and ignores them without one", async () => {
    const instance = fakeInstance();
    vi.doMock("tippy.js", () => ({ default: vi.fn(() => instance) }));

    const { default: Tooltip } = await import("../../lib/tooltip");

    const handle = React.createRef<{ show(): void; hide(): void }>();
    const { root } = mount(
      <Tooltip ref={handle} content="imperative" trigger="manual">
        <button type="button">g</button>
      </Tooltip>,
    );

    // Before the load settles the handle is inert rather than throwing.
    act(() => handle.current!.show());
    expect(instance.show).not.toHaveBeenCalled();

    await settle();
    act(() => handle.current!.show());
    act(() => handle.current!.hide());
    expect(instance.show).toHaveBeenCalledTimes(1);
    expect(instance.hide).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
