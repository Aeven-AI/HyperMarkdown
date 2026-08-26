// Everything the renderer knows about markdown syntax, in one place: the
// patterns it matches against, and the normalisation that maps the notations
// models emit for maths onto the "$"/"$$" remark-math understands.
//
// The patterns are shared rather than rebuilt per renderer. That is safe
// because every global-flag pattern here is either used through match, split,
// replace or search — which ignore lastIndex — or resets lastIndex before it
// execs. Anything stateful per renderer (the inline-token caches) stays on the
// renderer itself.
class MarkdownSyntax {
  readonly hrRegex: RegExp;
  readonly pipeRegex: RegExp;
  readonly closeRegex: RegExp;
  readonly whiteRegex: RegExp;
  readonly emptyRegex: RegExp;
  readonly blankRegex: RegExp;
  readonly hrCloseRegex: RegExp;
  readonly fencedCloseRegex: RegExp;
  readonly indentedRegex: RegExp;
  readonly interuptRegex: RegExp;
  readonly refRegex: RegExp;
  readonly definitionRegex: RegExp;
  readonly invalidTaskRegex: RegExp;
  readonly escapedChar: RegExp;
  readonly footnoteRegex: RegExp;
  readonly footnoteDefRegex: RegExp;
  readonly fencedCodeRegex: RegExp;
  readonly indentedCodeRegex: RegExp;
  readonly codeCachedInitRegex: RegExp;
  readonly incompleteFenceRegex: RegExp;
  readonly tableRendererInitRegex: RegExp;
  readonly inlineLinkCloseRegex: RegExp;
  readonly mathProtectedRegex: RegExp;
  readonly mathSplitterRegex: RegExp;
  readonly mathLooksLeftRegex: RegExp;
  readonly mathLooksRightRegex: RegExp;
  readonly mathSpaceRegex: RegExp;
  readonly mathPendingTag: string;
  readonly inlineTokens: string[];
  readonly angleOpenRegex: RegExp;
  readonly setextRegex: RegExp;
  readonly trailingSpaceRegex: RegExp;
  readonly emphasisTokenRegex: RegExp;
  readonly rawTextTags: string[];
  readonly partialRowRegex: RegExp;
  readonly blankCharRegex: RegExp;
  readonly definitionLineRegex: RegExp;
  readonly blankOnlyRegex: RegExp;
  readonly lineSplitRegex: RegExp;
  readonly listMarkerRegex: RegExp;
  readonly listIndentOnlyRegex: RegExp;
  readonly listLooseRegex: RegExp;
  readonly footnoteDefinitionRegex: RegExp;
  readonly footnoteContinuationRegex: RegExp;
  readonly fenceLineRegex: RegExp;
  readonly partialFenceRegex: RegExp;
  readonly fenceOnlyRegex: RegExp;
  readonly punctuationRegex: RegExp;
  readonly partialEntityRegex: RegExp;
  readonly htmlBlockStartRegex: RegExp;
  readonly htmlBlockTagRegex: RegExp;
  readonly listItemRegex: RegExp;
  readonly indentedFenceRegex: RegExp;
  readonly listIndentRegex: RegExp;
  readonly listPartialRegex: RegExp;
  readonly markerOnlyRegex: RegExp;
  readonly nestedMarkerRegex: RegExp;

  constructor() {
    this.hrRegex = /\n[ \t]*([-*_]{1,2})[ \t]*$/;
    this.pipeRegex = /(?<!\\)\|/g;
    this.closeRegex = /(?<!\\)\|/;

    this.whiteRegex = /^\s*/;
    this.emptyRegex = /(\s+)/g;
    this.blankRegex = /^\s*$/;

    this.hrCloseRegex = /(?:^|\n)([ \t]*(?:([-_*])\2{2,}|[*_]{3,})[ \t]*\n)/;
    this.fencedCloseRegex = /(```|~~~)[\s\S]*?\1/;

    this.indentedRegex = /^\t|^ {4,}/;
    this.interuptRegex = /\n[ \t]*(?:```|~~~)/;

    this.refRegex = /\[[^\]]+\]\s*\[[^\]]*\]/;
    this.definitionRegex = /^\s*\[[^\]]+\]:\s*(\S.*)?\n\n/m;

    // The bullet may sit behind blockquote markers: "> - [x] ".
    this.invalidTaskRegex =
      /(^|\n)([\s>]*(?:\*|-|\+)\s+.*?)(\[[xX ]?|\[[xX ]\]\s*)$/;

    this.escapedChar = /[.*+?^${}()|[\]\\]/g;

    this.footnoteRegex = /\[\^[^\]]+\]/g;
    this.footnoteDefRegex = /^\s*\[\^[^\]]+\]:.*(?:\n(?:\s*$|\s+.*))*/gm;

    this.fencedCodeRegex = /^([ \t]*\n)*[ \t]*(?:```|~~~)[^\r\n]*[\r\n]/;
    this.indentedCodeRegex = /^([ \t]*\n)*([ \t]{4,}|[ \t]*\t)/;
    this.codeCachedInitRegex = /^(?:```(\w*)[^\r\n]*(?:\r\n|\n)|(?: {4}|\t{4}))/;
    this.incompleteFenceRegex = /^([ \t]*\n)*[ \t]*(?:```|~~~)[^\r\n]*$/;
    this.tableRendererInitRegex =
      /^((?:[^\n]*\|[^\n]*\n)+(?:[ \t]*\|[ \t]*-+[ \t]*(?::[ \t]*-+[ \t]*)*[ \t]*\|[^\n]*\n(?:[^\n]*\|[^\n]*\n)+|(?:[^\n]*\|[^\n]*\n)+))/gm;
    this.inlineLinkCloseRegex = /(?:^|\s)(!?\[[^\]]+\]\([^)]+?\))$/;

    this.mathProtectedRegex = new RegExp(
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
      "g"
    );
    this.mathSplitterRegex = /(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g;
    this.mathLooksLeftRegex = /[\\](?:left|bigl|Bigl|biggl|Biggl)\s*$/;
    this.mathLooksRightRegex = /^\s*[\\](?:right|bigr|Bigr|biggr|Biggr)/;
    this.mathSpaceRegex = /\s/;
    this.mathPendingTag = '<span class="math-pending"></span>';

    // "*" and "_" are handled by fixEmphasis, which matches them as runs.
    this.inlineTokens = ["~~", "~", "`"];

    // Characters that can follow "<" in a tag, comment or angle autolink.
    this.angleOpenRegex = /[A-Za-z!/?]/;

    // A line made only of "-" or "=" underlines the line above it.
    this.setextRegex = /^[ \t]*(?:-+|=+)[ \t]*$/;

    this.trailingSpaceRegex = /\s+$/;
    this.emphasisTokenRegex = /^[*_~]+$/;

    // Elements whose children must stay plain text.
    this.rawTextTags = ["script", "style", "textarea", "title"];

    // A row made only of pipes, colons and dashes: a delimiter still arriving.
    this.partialRowRegex = /^[ \t]{0,3}\|[ \t:|-]*$/;
    this.blankCharRegex = /[ \t\r\n]/;

    // "[label]:" or "[^note]:" starting a line — a link or footnote definition.
    this.definitionLineRegex = /^[ \t]{0,3}\[[^\]]+\]:/;
    this.blankOnlyRegex = /^[ \t]*$/;
    this.lineSplitRegex = /\r\n?|\n/;

    // A top-level list item, and the marker family it belongs to.
    this.listMarkerRegex = /^[ \t]*([-*+]|\d{1,9}[.)])[ \t]/;
    this.listIndentOnlyRegex = /^[ \t]*/;
    // A blank line with content after it makes a list loose, so its items
    // wrap their contents in a paragraph.
    this.listLooseRegex = /\n[ \t]*\n[\s\S]*\S/;

    // A footnote definition line, and the indented lines that continue one.
    this.footnoteDefinitionRegex = /^[ \t]{0,3}\[\^[^\]]+\]:/;
    this.footnoteContinuationRegex = /^(?:\t|[ \t]{4,})/;
    this.fenceLineRegex = /^[ \t]{0,3}(?:`{3,}|~{3,})/m;
    this.partialFenceRegex = /^[ \t]{0,3}(?:`{1,2}|~{1,2})$/;
    this.fenceOnlyRegex = /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*\n?$/;
    this.punctuationRegex = /[!-/:-@[-`{-~]/;
    this.partialEntityRegex = /&[a-zA-Z0-9#]*$/;

    // A line holding only a tag or a comment opens a raw HTML block.
    this.htmlBlockStartRegex =
      /^[ \t]{0,3}(?:<!--|<\/?[A-Za-z][\w:-]*(?:\s[^<>]*?)?\/?>[ \t]*$)/;

    // CommonMark type 6: these tags open a raw block even when other
    // content follows them on the same line.
    this.htmlBlockTagRegex = new RegExp(
      "^[ \\t]{0,3}</?(?:" + "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|pre|script|search|section|style|summary|table|tbody|td|textarea|tfoot|th|thead|title|tr|track|ul" + ")(?:[ \\t/>]|$)",
      "i"
    );

    // Does the text after a blank line still belong to the list above it?
    this.listItemRegex = /^[ \t]{0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/;
    this.indentedFenceRegex = /^[ \t]*(?:`{3,}|~{3,})/;
    this.listIndentRegex = /^(?:[ \t]{2,}|\t)/;
    this.listPartialRegex = /^[ \t]{0,3}(?:[-*+]|\d{1,9}[.)]?)?[ \t]*$/;

    // A list marker on a line by itself, with its item text still to come.
    // The marker may sit behind blockquote markers: "> 1.".
    this.markerOnlyRegex = /^[ \t>]*(?:[-*+]|\d{1,9}[.)]?)[ \t]*$/;
    this.nestedMarkerRegex =
      /((?:^|\n)[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+)(?:[-*+]|\d{1,9}[.)]?)[ \t]*$/;
  }

  convertMath(
    mdBuffer: string | null | undefined,
    blockType?: string
  ): string | null | undefined {
    const vm = this;

    const tokens = vm.mathProtectedRegex;
    const mathSplitter = vm.mathSplitterRegex;
    const looksLikeLeft = vm.mathLooksLeftRegex;
    const looksLikeRight = vm.mathLooksRightRegex;

    if (mdBuffer == null) {
      return mdBuffer;
    }

    if (!tokens) {
      return mdBuffer;
    } else {
      if (blockType === "code") {
        return mdBuffer;
      } else {
        if (tokens) {
          tokens.lastIndex = 0;
        }

        return mdBuffer
          .split(tokens)
          .map((chunk, i) => {
            const protectedRegion = i % 2 === 1;
            return protectedRegion ? chunk || "" : transformUnsafe(chunk || "");
          })
          .join("");
      }
    }

    function transformUnsafe(text: string): string {
      // TeX display "\[ … \]", only when the delimiters sit on their own lines
      text = text.replace(
        /(?<!\\)\\\[\s*\r?\n([\s\S]*?)\r?\n\s*\\\](?!\])/g,
        (_m, body) => `\n$$\n${(body || "").trim()}\n$$\n`
      );

      // TeX inline "\( … \)" → "$ … $"
      text = text.replace(
        /(?<!\\)\\\(([\s\S]*?)\\\)/g,
        (_m, body) => `$${(body || "").trim()}$`
      );

      // Bracketed block "[\n … \n]" → "$$ … $$"
      text = text.replace(
        /^[ \t]*\[\s*\r?\n([\s\S]*?)\r?\n[ \t]*\][ \t]*$/gm,
        (_m, body) => `\n$$\n${(body || "").trim()}\n$$\n`
      );

      return convertInlineOutsideMath(text);
    }

    function convertInlineOutsideMath(text: string): string {
      if (mathSplitter) {
        mathSplitter.lastIndex = 0;
      }

      return text
        .split(mathSplitter)
        .map((seg, i) => {
          if (i % 2 === 1) return seg;

          // "(( … ))" → "$…$"
          seg = seg.replace(
            /(?<!\\)\(\(\s*([\s\S]*?)\s*\)\)/g,
            (m, body, offset, str) => {
              if (offset > 0 && str.charAt(offset - 1) === "]") return m;
              const before = str.slice(Math.max(0, offset - 12), offset);
              const after = str.slice(offset + m.length, offset + m.length + 12);
              if (looksLikeLeft.test(before) || looksLikeRight.test(after))
                return m;
              return `$${(body || "").trim()}$`;
            }
          );

          // "( … )" with padding spaces → "$…$"
          seg = seg.replace(
            /(?<!\\)\(\s+([\s\S]*?)\s+\)/g,
            (m, body, offset, str) => {
              // a "]" before it makes this a link destination, not maths
              if (offset > 0 && str.charAt(offset - 1) === "]") return m;
              const before = str.slice(Math.max(0, offset - 12), offset);
              const after = str.slice(offset + m.length, offset + m.length + 12);
              if (looksLikeLeft.test(before) || looksLikeRight.test(after))
                return m;
              return `$${(body || "").trim()}$`;
            }
          );

          return seg;
        })
        .join("");
    }
  }
}

export default MarkdownSyntax;
