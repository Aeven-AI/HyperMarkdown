/**
 * The small pieces of host-application plumbing the renderer used to reach for.
 * Reimplemented here so the component stands on its own.
 */

import type { Mermaid } from "mermaid";

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

export interface AlertEvent {
  type: "alertModal";
  header: string;
  content: string;
  buttonText?: string;
}

interface RuntimeEventMap {
  "fullscreen:change": boolean;
  "show:modal": AlertEvent;
}

type RuntimeEvent = keyof RuntimeEventMap;
type Handler<K extends RuntimeEvent> = (payload: RuntimeEventMap[K]) => void;

/**
 * Minimal replacement for the host's event bus. The renderer only ever needed
 * to broadcast scroll and fullscreen changes between its own components.
 */
class Emitter {
  private handlers: {
    [K in RuntimeEvent]: Map<string, Handler<K>>;
  } = {
    "fullscreen:change": new Map(),
    "show:modal": new Map(),
  };

  on<K extends RuntimeEvent>(event: K, id: string, handler: Handler<K>): void {
    const forEvent = this.handlers[event] as Map<string, Handler<K>>;

    forEvent.set(id, handler);
  }

  off<K extends RuntimeEvent>(event: K, id: string): void {
    this.handlers[event]?.delete(id);
  }

  dispatchObjectEvent<K extends RuntimeEvent>(
    event: K,
    payload: RuntimeEventMap[K]
  ): void {
    const forEvent = this.handlers[event] as Map<string, Handler<K>>;

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
let mermaidModule: Mermaid | null = null;
let mermaidPromise: Promise<Mermaid> | null = null;

export function getMermaidModule(): Mermaid | null {
  return mermaidModule;
}

export function loadMermaidModule(): Promise<Mermaid> {
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
