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
 * The bus a renderer's own blocks talk to it on.
 *
 * One per renderer, never a module singleton: a page showing many messages
 * mounts many renderers, and a global bus would make every one of them hear
 * every other one's blocks going fullscreen.
 */
export class Emitter {
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
    payload: RuntimeEventMap[K],
  ): void {
    const forEvent = this.handlers[event] as Map<string, Handler<K>>;

    forEvent.forEach((handler) => {
      handler(payload);
    });
  }
}

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
