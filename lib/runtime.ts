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

/**
 * Open HTML as a page of its own, and hand back whether a window was had.
 *
 * A blank window written into with `document.write` is gone the moment the
 * reader reloads it, which is the first thing anyone does to a preview they
 * are debugging. A blob URL is a real address instead: the window reloads,
 * inspects and views source like any other page.
 *
 * The URL is deliberately never revoked. Revoking is what frees the blob, and
 * the reload the reader is about to do has to fetch it again. It lives as long
 * as the document that made it, which is the page holding the code block.
 */
export function openHtmlWindow(html: string): boolean {
  let url;
  let opened;

  if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") {
    return false;
  }

  try {
    url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  } catch {
    return false;
  }

  opened = window.open(url, "_blank");

  if (!opened) {
    // Blocked, or a host embedded without `allow-popups`: nothing is going to
    // read this blob, so let it go.
    URL.revokeObjectURL(url);
    return false;
  }

  return true;
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

/** Distance from the host's sticky chat header at which a block toolbar goes flat. */
const STICKY_HEADER_OFFSET = 56;

/** Below this the block is nearly scrolled past, so the toolbar drops away. */
const STICKY_HEADER_MIN_VISIBLE = 106;

interface StickyHeader {
  readonly wrapper: () => HTMLElement | null;
  readonly header: () => HTMLElement | null;
  readonly fullscreen: () => boolean;
  target: HTMLElement | null;
  stuck: boolean;
}

/** Handle for one block toolbar registered with {@link watchStickyHeader}. */
export interface StickyHeaderWatch {
  /** Recompute this toolbar now, for changes no scroll reports (fullscreen). */
  update(): void;
  /** Stop watching and clear the class, so a later registration starts from the element's real state. */
  stop(): void;
}

const stickyPending = new Set<StickyHeader>();
const stickyOnScreen = new Set<StickyHeader>();
const stickyByTarget = new Map<Element, StickyHeader>();
let stickyObserver: IntersectionObserver | undefined;
let stopStickyScroll: (() => void) | undefined;

function isStuck(entry: StickyHeader): boolean {
  if (entry.target === null || entry.fullscreen()) return false;
  const rect = entry.target.getBoundingClientRect();
  const top = rect.top || 0;
  return top < STICKY_HEADER_OFFSET && top + (rect.height || 0) > STICKY_HEADER_MIN_VISIBLE;
}

function setStuck(entry: StickyHeader, stuck: boolean): void {
  if (entry.stuck === stuck) return;
  entry.stuck = stuck;
  entry.header()?.classList.toggle("scroll", stuck);
}

/** Reads every on-screen block before writing any class, so one pass lays out once. */
function updateOnScreen(): void {
  const next = [...stickyOnScreen].map((entry) => [entry, isStuck(entry)] as const);
  for (const [entry, stuck] of next) setStuck(entry, stuck);
}

/** Scroll and resize are watched only while some block is on screen. */
function syncStickyScroll(): void {
  if (stickyOnScreen.size > 0) {
    stopStickyScroll ??= onViewportScroll(updateOnScreen);
  } else {
    stopStickyScroll?.();
    stopStickyScroll = undefined;
  }
}

function onStickyIntersection(entries: IntersectionObserverEntry[]): void {
  for (const change of entries) {
    const entry = stickyByTarget.get(change.target);
    if (entry === undefined) continue;
    if (change.isIntersecting) {
      stickyOnScreen.add(entry);
      setStuck(entry, isStuck(entry));
    } else {
      // Off screen the block cannot span the toolbar band.
      stickyOnScreen.delete(entry);
      setStuck(entry, false);
    }
  }
  syncStickyScroll();
}

/** Attach registrations whose wrapper ref has committed since they were made. */
function attachPending(): void {
  for (const entry of stickyPending) {
    const target = entry.wrapper();
    if (target === null) continue;
    stickyPending.delete(entry);
    entry.target = target;
    stickyByTarget.set(target, entry);
    if (typeof IntersectionObserver === "undefined") {
      stickyOnScreen.add(entry);
      setStuck(entry, isStuck(entry));
    } else {
      stickyObserver ??= new IntersectionObserver(onStickyIntersection);
      stickyObserver.observe(target);
    }
  }
  syncStickyScroll();
}

/**
 * Keep a block toolbar's "scroll" class in step with its block's position:
 * set while the block spans the band below the host's sticky header, cleared
 * otherwise and in fullscreen.
 *
 * One IntersectionObserver and one capturing scroll listener serve every
 * block on the page, and the listener measures only blocks on screen, so an
 * idle transcript with hundreds of blocks costs nothing per scroll frame. The
 * class is written only when the state changes: `classList` add and remove
 * rewrite the attribute, and so queue a mutation record, even when the token
 * is already in the requested state.
 *
 * The wrapper is read on the next frame, after the host commits its ref;
 * without IntersectionObserver every block counts as on screen.
 * @param wrapper - reads the block element whose position decides the state.
 * @param header - reads the toolbar element that carries the class.
 * @param fullscreen - reads whether the block is fullscreen.
 * @returns the registration's update and stop handle.
 */
export function watchStickyHeader(
  wrapper: () => HTMLElement | null,
  header: () => HTMLElement | null,
  fullscreen: () => boolean,
): StickyHeaderWatch {
  const entry: StickyHeader = { wrapper, header, fullscreen, target: null, stuck: false };

  if (typeof window === "undefined") {
    return { update() {}, stop() {} };
  }

  stickyPending.add(entry);
  requestAnimationFrame(attachPending);

  return {
    update() {
      if (entry.target === null) return;
      if (fullscreen()) setStuck(entry, false);
      else if (stickyOnScreen.has(entry)) setStuck(entry, isStuck(entry));
    },
    stop() {
      setStuck(entry, false);
      stickyPending.delete(entry);
      stickyOnScreen.delete(entry);
      if (entry.target !== null) {
        stickyByTarget.delete(entry.target);
        stickyObserver?.unobserve(entry.target);
        entry.target = null;
      }
      syncStickyScroll();
    },
  };
}
