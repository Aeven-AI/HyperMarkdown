/**
 * The small pieces of host-application plumbing the renderer used to reach for.
 * Reimplemented here so the component stands on its own.
 */

let counter = 0;

/** Stable-enough id for keying rendered blocks. */
export function guid(): string {
  counter += 1;
  return "hm-" + Date.now().toString(36) + "-" + counter.toString(36);
}

export function timeNow(): number {
  return Date.now();
}

/** Persist a value, tolerating browsers that refuse storage. */
export function setItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode, blocked storage: not worth failing a render over */
  }
}

export function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function currentPath(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

type Handler = (payload?: unknown) => void;

/**
 * Minimal replacement for the host's event bus. The renderer only ever needed
 * to broadcast scroll and fullscreen changes between its own components.
 */
class Emitter {
  private handlers = new Map<string, Map<string, Handler>>();

  on(event: string, id: string, handler: Handler): void {
    let forEvent = this.handlers.get(event);

    if (!forEvent) {
      forEvent = new Map();
      this.handlers.set(event, forEvent);
    }

    forEvent.set(id, handler);
  }

  off(event: string, id: string): void {
    this.handlers.get(event)?.delete(id);
  }

  dispatchObjectEvent(event: string, payload?: unknown): void {
    const forEvent = this.handlers.get(event);

    if (!forEvent) {
      return;
    }

    forEvent.forEach((handler) => {
      handler(payload);
    });
  }
}

export const emitter = new Emitter();

/**
 * Watch anything that could move a block through the viewport, so a block's
 * sticky toolbar can restyle itself as it scrolls past.
 *
 * Scroll events do not bubble, but they do travel the capture phase, so a
 * single capturing listener on the window sees every scroll container on the
 * page. That keeps the component self-contained: the host does not have to
 * forward its own scroll events for the toolbars to work.
 */
export function onViewportScroll(handler: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("scroll", handler, true);
  window.addEventListener("resize", handler);

  return () => {
    window.removeEventListener("scroll", handler, true);
    window.removeEventListener("resize", handler);
  };
}

/** Mermaid is heavy and rarely needed; load it only when a diagram appears. */
let mermaidModule: unknown = null;
let mermaidPromise: Promise<unknown> | null = null;

export function getMermaidModule(): unknown {
  return mermaidModule;
}

export function loadMermaidModule(): Promise<unknown> {
  if (mermaidModule) {
    return Promise.resolve(mermaidModule);
  }

  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((module) => {
      mermaidModule = module.default ?? module;
      return mermaidModule;
    });
  }

  return mermaidPromise;
}
