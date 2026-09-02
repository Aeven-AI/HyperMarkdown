import {
  ICON_CHEVRON,
  ICON_COPY,
  ICON_MAXIMIZE,
  ICON_MINIMIZE,
  ICON_RESET_VIEW,
  ICON_RUN,
  ICON_ZOOM_IN,
  ICON_ZOOM_OUT,
} from "./icons";

/**
 * Every string the renderer puts on screen. Override any subset; anything not
 * given keeps the English default.
 */
export interface Translations {
  /** Title shown on a table's toolbar. */
  table: string;
  /** Title shown on a diagram's toolbar. */
  diagram: string;

  /** Header of a reasoning block while the model is still thinking. */
  thinking: string;
  /** Header once it has finished. `{seconds}` is replaced with the duration. */
  thoughtFor: string;

  copy: string;
  copyCode: string;
  fullScreen: string;
  /** The same button once the block is expanded. */
  exitFullScreen: string;
  preview: string;
  zoomIn: string;
  zoomOut: string;
  resetView: string;

  tableCopied: string;
  tablePartiallyCopied: string;
  codeCopied: string;
  codePartiallyCopied: string;

  /** Shown when a code preview is asked for before the code has finished. */
  previewPendingTitle: string;
  previewPendingBody: string;
  previewUnavailableTitle: string;
  previewUnavailableBody: string;
  dismiss: string;
}

export const defaultTranslations: Translations = {
  table: "Table",
  diagram: "Diagram",

  thinking: "Thinking…",
  thoughtFor: "Thought for {seconds}s",

  copy: "Copy",
  copyCode: "Copy code",
  fullScreen: "Full screen",
  exitFullScreen: "Exit full screen",
  preview: "Preview",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  resetView: "Reset zoom and pan",

  tableCopied: "Table copied",
  tablePartiallyCopied: "Table partially copied",
  codeCopied: "Code copied",
  codePartiallyCopied: "Code partially copied",

  previewPendingTitle: "Rendering code",
  previewPendingBody: "Please wait until the code is fully rendered",
  previewUnavailableTitle: "Code unavailable",
  previewUnavailableBody: "The code preview is unavailable",
  dismiss: "Ok",
};

/**
 * The toolbar icons, as markup: each is injected into a button whose
 * stylesheet targets the svg inside it. Supply your own to match a design
 * system — an inline `<svg …>` string, not a component.
 */
export interface IconMap {
  copy: string;
  maximize: string;
  minimize: string;
  run: string;
  zoomIn: string;
  zoomOut: string;
  resetView: string;
  /** The disclosure arrow on a reasoning block. */
  chevron: string;
}

export const defaultIcons: IconMap = {
  copy: ICON_COPY,
  maximize: ICON_MAXIMIZE,
  minimize: ICON_MINIMIZE,
  run: ICON_RUN,
  zoomIn: ICON_ZOOM_IN,
  zoomOut: ICON_ZOOM_OUT,
  resetView: ICON_RESET_VIEW,
  chevron: ICON_CHEVRON,
};

/** Which toolbar buttons a block offers. `false` hides the toolbar entirely. */
export interface BlockControls {
  copy?: boolean | undefined;
  fullscreen?: boolean | undefined;
  /** Code blocks only: open the code in a preview window. */
  preview?: boolean | undefined;
}

export interface DiagramControls extends BlockControls {
  /** Show zoom buttons and allow wheel/touch/mouse panning. */
  panZoom?: boolean | undefined;
}

export interface ControlsConfig {
  /** Reasoning blocks. `false` renders the reasoning without its wrapper. */
  reasoning?: boolean | undefined;
  table?: boolean | BlockControls | undefined;
  code?: boolean | BlockControls | undefined;
  diagram?: boolean | DiagramControls | undefined;
}

export interface ResolvedControls {
  copy: boolean;
  fullscreen: boolean;
  preview: boolean;
}

export interface ResolvedDiagramControls extends ResolvedControls {
  panZoom: boolean;
}

const ALL_ON: ResolvedControls = {
  copy: true,
  fullscreen: true,
  preview: true,
};
const ALL_OFF: ResolvedControls = {
  copy: false,
  fullscreen: false,
  preview: false,
};

function resolveBlock(
  value: boolean | BlockControls | undefined,
): ResolvedControls {
  if (value === false) {
    return ALL_OFF;
  }

  if (value === undefined || value === true) {
    return ALL_ON;
  }

  return {
    copy: value.copy !== false,
    fullscreen: value.fullscreen !== false,
    preview: value.preview !== false,
  };
}

function resolveDiagram(
  value: boolean | DiagramControls | undefined,
): ResolvedDiagramControls {
  let controls;

  controls = resolveBlock(value);

  return {
    ...controls,
    panZoom:
      value === false
        ? false
        : typeof value === "object"
          ? value.panZoom !== false
          : true,
  };
}

/**
 * Everything about how the renderer presents itself, resolved once so the
 * components deep in a rendered document read plain values rather than
 * unpacking optional config on every render.
 */
export interface UiConfig {
  translations: Translations;
  icons: IconMap;
  controls: {
    table: ResolvedControls;
    code: ResolvedControls;
    diagram: ResolvedDiagramControls;
    /** False renders reasoning inline, without its collapsible wrapper. */
    reasoning: boolean;
  };
  /** Show the line-number gutter on code blocks. */
  lineNumbers: boolean;
  /** Max height for a code block before it scrolls. Numbers are px. */
  codeBlockMaxHeight: number | string | undefined;
  /** Max height for a table before it scrolls. Numbers are px. */
  tableMaxHeight: number | string | undefined;
  /** Where a code block's HTML preview opens. */
  preview: PreviewConfig;
}

/**
 * Where a code block's HTML preview opens.
 *
 * Left alone, the block opens the HTML as a page of its own, from a blob URL:
 * a real document with a real address, which reloads, inspects and views its
 * source like any other page, and needs nothing of the host to do it.
 *
 * Give it a `url` and the page is handed off instead — the HTML is written to
 * storage under `storageKey`, and that URL is opened to read it back, which is
 * how a host serves a preview page it has already built.
 */
export interface PreviewConfig {
  /**
   * The page to open. `{id}` in a string is replaced with the block's id; a
   * function is called with it, for hosts whose routes need more than
   * substitution.
   */
  url?: string | ((id: string) => string) | undefined;
  /**
   * The localStorage key the HTML is written to before that page opens.
   * Defaults to `preview-{id}`. Only used when `url` is set — the built-in
   * preview holds the HTML in memory and stores nothing.
   */
  storageKey?: string | ((id: string) => string) | undefined;
}

export interface UiOptions {
  translations?: Partial<Translations> | undefined;
  icons?: Partial<IconMap> | undefined;
  controls?: ControlsConfig | undefined;
  lineNumbers?: boolean | undefined;
  codeBlockMaxHeight?: number | string | undefined;
  tableMaxHeight?: number | string | undefined;
  preview?: PreviewConfig | undefined;
}

export function resolveUi(options: UiOptions = {}): UiConfig {
  return {
    translations: { ...defaultTranslations, ...options.translations },
    icons: { ...defaultIcons, ...options.icons },
    controls: {
      table: resolveBlock(options.controls?.table),
      code: resolveBlock(options.controls?.code),
      diagram: resolveDiagram(options.controls?.diagram),
      reasoning: options.controls?.reasoning !== false,
    },
    lineNumbers: options.lineNumbers !== false,
    codeBlockMaxHeight: options.codeBlockMaxHeight,
    tableMaxHeight: options.tableMaxHeight,
    preview: { ...options.preview },
  };
}

/**
 * Fill one of the preview config's templates. A function is handed the id; a
 * string has `{id}` replaced wherever it appears, so a route, a query string
 * and a hash are all reachable without the host writing a function.
 */
export function previewValue(
  template: string | ((id: string) => string) | undefined,
  id: string,
  fallback = "",
): string {
  if (typeof template === "function") {
    return template(id);
  }

  if (typeof template !== "string") {
    return fallback.split("{id}").join(id);
  }

  return template.split("{id}").join(id);
}

/** CSS length from a config value: bare numbers mean pixels. */
export function cssLength(
  value: number | string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "number" ? `${value}px` : value;
}

/**
 * The defaults, resolved once. Components fall back to this when they are
 * rendered outside a renderer that configured them.
 */
export const defaultUi: UiConfig = resolveUi();
