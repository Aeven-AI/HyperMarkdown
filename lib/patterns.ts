// Every pattern the renderer matches markdown against, in one place.
//
// The patterns are shared by every renderer rather than rebuilt per instance.
// That is safe because each global-flag pattern here is either used through
// match, split, replace or search — which ignore lastIndex — or resets
// lastIndex before it execs. Anything stateful per renderer (the inline-token
// caches) stays on the renderer itself.
export const patterns = {
  hrRegex: /\n[ \t]*([-*_]{1,2})[ \t]*$/,
  pipeRegex: /(?<!\\)\|/g,
  closeRegex: /(?<!\\)\|/,

  whiteRegex: /^\s*/,
  emptyRegex: /(\s+)/g,
  blankRegex: /^\s*$/,

  hrCloseRegex: /(?:^|\n)([ \t]*(?:([-_*])\2{2,}|[*_]{3,})[ \t]*\n)/,
  fencedCloseRegex:
    /^(?:[ \t]{0,3}(`{3,})(?!`)[^\r\n]*(?=\r?\n)[\s\S]*?\r?\n[ \t]{0,3}\1`*[ \t]*|[ \t]{0,3}(~{3,})(?!~)[^\r\n]*(?=\r?\n)[\s\S]*?\r?\n[ \t]{0,3}\2~*[ \t]*)/,

  indentedRegex: /^\t|^ {4,}/,
  interuptRegex: /\n[ \t]*(?:```|~~~)/,

  refRegex: /\[[^\]]+\]\s*\[[^\]]*\]/,
  definitionRegex: /^\s*\[[^\]]+\]:\s*(\S.*)?\n\n/m,

  // The bullet may sit behind blockquote markers: "> - [x] ".
  invalidTaskRegex: /(^|\n)([\s>]*(?:\*|-|\+)\s+.*?)(\[[xX ]?|\[[xX ]\]\s*)$/,

  escapedChar: /[.*+?^${}()|[\]\\]/g,

  footnoteRegex: /\[\^[^\]]+\]/g,
  footnoteDefRegex: /^\s*\[\^[^\]]+\]:.*(?:\n(?:\s*$|\s+.*))*/gm,

  fencedCodeRegex: /^([ \t]*\n)*[ \t]*(?:```|~~~)[^\r\n]*[\r\n]/,
  indentedCodeRegex: /^([ \t]*\n)*([ \t]{4,}|[ \t]*\t)/,
  codeCachedInitRegex: /^(?:((?:`{3,}|~{3,}))(\w*)[^\r\n]*(?:\r\n|\n)|(?: {4}|\t{4}))/,
  incompleteFenceRegex: /^([ \t]*\n)*[ \t]*(?:```|~~~)[^\r\n]*$/,
  tableRendererInitRegex:
    /^((?:[^\n]*\|[^\n]*\n)+(?:[ \t]*\|[ \t]*-+[ \t]*(?::[ \t]*-+[ \t]*)*[ \t]*\|[^\n]*\n(?:[^\n]*\|[^\n]*\n)+|(?:[^\n]*\|[^\n]*\n)+))/gm,
  inlineLinkCloseRegex: /(?:^|\s)(!?\[[^\]]+\]\([^)]+?\))$/,

  mathProtectedRegex: new RegExp(
    "(" +
      [
        "```[\\s\\S]*?```",
        "~~~[\\s\\S]*?~~~",
        "`[^`\\n]+`",
        "<!--[\\s\\S]*?-->",
        "<[A-Za-z][\\w:-]*(?:\\s[^<>]*?)?>[\\s\\S]*?<\\/[ \\t]*[A-Za-z][\\w:-]*[ \\t]*>",
        "<[A-Za-z][\\w:-]*(?:\\s[^<>]*?)?\\/[ \\t]*>",
        "<>[\\s\\S]*?<\\/>",
      ].join("|") +
      ")",
    "g",
  ),
  mathSplitterRegex: /(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g,
  mathLooksLeftRegex: /[\\](?:left|bigl|Bigl|biggl|Biggl)\s*$/,
  mathLooksRightRegex: /^\s*[\\](?:right|bigr|Bigr|biggr|Biggr)/,
  mathSpaceRegex: /\s/,
  mathPendingTag: '<span class="math-pending"></span>',

  // "*" and "_" are handled by fixEmphasis, which matches them as runs.
  inlineTokens: ["~~", "~", "`"],

  // Characters that can follow "<" in a tag, comment or angle autolink.
  angleOpenRegex: /[A-Za-z!/?]/,

  // A line made only of "-" or "=" underlines the line above it.
  setextRegex: /^[ \t]*(?:-+|=+)[ \t]*$/,

  trailingSpaceRegex: /\s+$/,
  emphasisTokenRegex: /^[*_~]+$/,

  // Elements whose children must stay plain text.
  rawTextTags: ["script", "style", "textarea", "title"],

  // A row made only of pipes, colons and dashes: a delimiter still arriving.
  partialRowRegex: /^[ \t]{0,3}\|[ \t:|-]*$/,
  blankCharRegex: /[ \t\r\n]/,

  // "[label]:" or "[^note]:" starting a line — a link or footnote definition.
  definitionLineRegex: /^[ \t]{0,3}\[[^\]]+\]:/,
  blankOnlyRegex: /^[ \t]*$/,
  lineSplitRegex: /\r\n?|\n/,

  // A top-level list item, and the marker family it belongs to.
  listMarkerRegex: /^[ \t]*([-*+]|\d{1,9}[.)])[ \t]/,
  listIndentOnlyRegex: /^[ \t]*/,
  // A blank line with content after it makes a list loose, so its items
  // wrap their contents in a paragraph.
  listLooseRegex: /\n[ \t]*\n[\s\S]*\S/,

  // A footnote definition line, and the indented lines that continue one.
  footnoteDefinitionRegex: /^[ \t]{0,3}\[\^[^\]]+\]:/,
  footnoteContinuationRegex: /^(?:\t|[ \t]{4,})/,
  fenceLineRegex: /^[ \t]{0,3}(?:`{3,}|~{3,})/m,
  partialFenceRegex: /^[ \t]{0,3}(?:`{1,2}|~{1,2})$/,
  fenceOnlyRegex: /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*\n?$/,
  punctuationRegex: /[!-/:-@[-`{-~]/,
  partialEntityRegex: /&[a-zA-Z0-9#]*$/,

  // A line holding only a tag or a comment opens a raw HTML block.
  htmlBlockStartRegex:
    /^[ \t]{0,3}(?:<!--|<\/?[A-Za-z][\w:-]*(?:\s[^<>]*?)?\/?>[ \t]*$)/,

  // CommonMark type 6: these tags open a raw block even when other
  // content follows them on the same line.
  htmlBlockTagRegex: new RegExp(
    "^[ \\t]{0,3}</?(?:" +
      "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|pre|script|search|section|style|summary|table|tbody|td|textarea|tfoot|th|thead|title|tr|track|ul" +
      ")(?:[ \\t/>]|$)",
    "i",
  ),

  // Does the text after a blank line still belong to the list above it?
  listItemRegex: /^[ \t]{0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/,
  indentedFenceRegex: /^[ \t]*(?:`{3,}|~{3,})/,
  listIndentRegex: /^(?:[ \t]{2,}|\t)/,
  listPartialRegex: /^[ \t]{0,3}(?:[-*+]|\d{1,9}[.)]?)?[ \t]*$/,

  // A list marker on a line by itself, with its item text still to come.
  // The marker may sit behind blockquote markers: "> 1.".
  markerOnlyRegex: /^[ \t>]*(?:[-*+]|\d{1,9}[.)]?)[ \t]*$/,
  nestedMarkerRegex:
    /((?:^|\n)[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+)(?:[-*+]|\d{1,9}[.)]?)[ \t]*$/,
};

export type Patterns = typeof patterns;
