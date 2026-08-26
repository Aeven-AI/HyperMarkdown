import { ICON_COPY, ICON_MAXIMIZE, ICON_MINIMIZE, ICON_RUN } from "./icons";

/**
 * Every string the renderer puts on screen. Override any subset; anything not
 * given keeps the English default.
 */
export interface Translations {
  /** Title shown on a table's toolbar. */
  table: string;
  /** Title shown on a diagram's toolbar. */
  diagram: string;

  copy: string;
  copyCode: string;
  fullScreen: string;
  preview: string;

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

  copy: "Copy",
  copyCode: "Copy code",
  fullScreen: "Full screen",
  preview: "Preview",

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
}

export const defaultIcons: IconMap = {
  copy: ICON_COPY,
  maximize: ICON_MAXIMIZE,
  minimize: ICON_MINIMIZE,
  run: ICON_RUN,
};

/** Which toolbar buttons a block offers. `false` hides the toolbar entirely. */
export interface BlockControls {
  copy?: boolean | undefined;
  fullscreen?: boolean | undefined;
  /** Code blocks only: open the code in a preview window. */
  preview?: boolean | undefined;
}

export interface ControlsConfig {
  table?: boolean | BlockControls | undefined;
  code?: boolean | BlockControls | undefined;
  diagram?: boolean | BlockControls | undefined;
}

export interface ResolvedControls {
  copy: boolean;
  fullscreen: boolean;
  preview: boolean;
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
    diagram: ResolvedControls;
  };
  /** Show the line-number gutter on code blocks. */
  lineNumbers: boolean;
  /** Max height for a code block before it scrolls. Numbers are px. */
  codeBlockMaxHeight: number | string | undefined;
  /** Max height for a table before it scrolls. Numbers are px. */
  tableMaxHeight: number | string | undefined;
}

export interface UiOptions {
  translations?: Partial<Translations> | undefined;
  icons?: Partial<IconMap> | undefined;
  controls?: ControlsConfig | undefined;
  lineNumbers?: boolean | undefined;
  codeBlockMaxHeight?: number | string | undefined;
  tableMaxHeight?: number | string | undefined;
}

export function resolveUi(options: UiOptions = {}): UiConfig {
  return {
    translations: { ...defaultTranslations, ...options.translations },
    icons: { ...defaultIcons, ...options.icons },
    controls: {
      table: resolveBlock(options.controls?.table),
      code: resolveBlock(options.controls?.code),
      diagram: resolveBlock(options.controls?.diagram),
    },
    lineNumbers: options.lineNumbers !== false,
    codeBlockMaxHeight: options.codeBlockMaxHeight,
    tableMaxHeight: options.tableMaxHeight,
  };
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
