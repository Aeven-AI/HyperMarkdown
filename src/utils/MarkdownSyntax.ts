let Instance;

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
  [key: string]: any;

  constructor() {
    if (Instance) {
      return Instance;
    }

    Instance = this;

    Instance.hrRegex = /\n[ \t]*([-*_]{1,2})[ \t]*$/;
    Instance.pipeRegex = /(?<!\\)\|/g;
    Instance.closeRegex = /(?<!\\)\|/;

    Instance.whiteRegex = /^\s*/;
    Instance.emptyRegex = /(\s+)/g;
    Instance.blankRegex = /^\s*$/;

    Instance.hrCloseRegex = /(?:^|\n)([ \t]*(?:([-_*])\2{2,}|[*_]{3,})[ \t]*\n)/;
    Instance.fencedCloseRegex = /(```|~~~)[\s\S]*?\1/;

    Instance.indentedRegex = /^\t|^ {4,}/;
    Instance.interuptRegex = /\n[ \t]*(?:```|~~~)/;

    Instance.refRegex = /\[[^\]]+\]\s*\[[^\]]*\]/;
    Instance.definitionRegex = /^\s*\[[^\]]+\]:\s*(\S.*)?\n\n/m;

    // The bullet may sit behind blockquote markers: "> - [x] ".
    Instance.invalidTaskRegex =
      /(^|\n)([\s>]*(?:\*|-|\+)\s+.*?)(\[[xX ]?|\[[xX ]\]\s*)$/;

    Instance.escapedChar = /[.*+?^${}()|[\]\\]/g;

    Instance.footnoteRegex = /\[\^[^\]]+\]/g;
    Instance.footnoteDefRegex = /^\s*\[\^[^\]]+\]:.*(?:\n(?:\s*$|\s+.*))*/gm;

    Instance.fencedCodeRegex = /^([ \t]*\n)*[ \t]*(?:```|~~~)[^\r\n]*[\r\n]/;
    Instance.indentedCodeRegex = /^([ \t]*\n)*([ \t]{4,}|[ \t]*\t)/;
    Instance.codeCachedInitRegex = /^(?:```(\w*)[^\r\n]*(?:\r\n|\n)|(?: {4}|\t{4}))/;
    Instance.incompleteFenceRegex = /^([ \t]*\n)*[ \t]*(?:```|~~~)[^\r\n]*$/;
    Instance.tableRendererInitRegex =
      /^((?:[^\n]*\|[^\n]*\n)+(?:[ \t]*\|[ \t]*-+[ \t]*(?::[ \t]*-+[ \t]*)*[ \t]*\|[^\n]*\n(?:[^\n]*\|[^\n]*\n)+|(?:[^\n]*\|[^\n]*\n)+))/gm;
    Instance.inlineLinkCloseRegex = /(?:^|\s)(!?\[[^\]]+\]\([^)]+?\))$/;

    Instance.mathProtectedRegex = new RegExp(
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
    Instance.mathSplitterRegex = /(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g;
    Instance.mathLooksLeftRegex = /[\\](?:left|bigl|Bigl|biggl|Biggl)\s*$/;
    Instance.mathLooksRightRegex = /^\s*[\\](?:right|bigr|Bigr|biggr|Biggr)/;
    Instance.mathSpaceRegex = /\s/;
    Instance.mathPendingTag = '<span class="math-pending"></span>';

    // "*" and "_" are handled by fixEmphasis, which matches them as runs.
    Instance.inlineTokens = ["~~", "~", "`"];

    // Characters that can follow "<" in a tag, comment or angle autolink.
    Instance.angleOpenRegex = /[A-Za-z!/?]/;

    // A line made only of "-" or "=" underlines the line above it.
    Instance.setextRegex = /^[ \t]*(?:-+|=+)[ \t]*$/;

    Instance.trailingSpaceRegex = /\s+$/;
    Instance.emphasisTokenRegex = /^[*_~]+$/;

    // Elements whose children must stay plain text.
    Instance.rawTextTags = ["script", "style", "textarea", "title"];

    // A row made only of pipes, colons and dashes: a delimiter still arriving.
    Instance.partialRowRegex = /^[ \t]{0,3}\|[ \t:|-]*$/;
    Instance.blankCharRegex = /[ \t\r\n]/;

    // "[label]:" or "[^note]:" starting a line — a link or footnote definition.
    Instance.definitionLineRegex = /^[ \t]{0,3}\[[^\]]+\]:/;
    Instance.blankOnlyRegex = /^[ \t]*$/;
    Instance.lineSplitRegex = /\r\n?|\n/;

    // A top-level list item, and the marker family it belongs to.
    Instance.listMarkerRegex = /^[ \t]*([-*+]|\d{1,9}[.)])[ \t]/;
    Instance.listIndentOnlyRegex = /^[ \t]*/;
    // A blank line with content after it makes a list loose, so its items
    // wrap their contents in a paragraph.
    Instance.listLooseRegex = /\n[ \t]*\n[\s\S]*\S/;

    // A footnote definition line, and the indented lines that continue one.
    Instance.footnoteDefinitionRegex = /^[ \t]{0,3}\[\^[^\]]+\]:/;
    Instance.footnoteContinuationRegex = /^(?:\t|[ \t]{4,})/;
    Instance.fenceLineRegex = /^[ \t]{0,3}(?:`{3,}|~{3,})/m;
    Instance.partialFenceRegex = /^[ \t]{0,3}(?:`{1,2}|~{1,2})$/;
    Instance.fenceOnlyRegex = /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*\n?$/;
    Instance.punctuationRegex = /[!-/:-@[-`{-~]/;
    Instance.partialEntityRegex = /&[a-zA-Z0-9#]*$/;

    // A line holding only a tag or a comment opens a raw HTML block.
    Instance.htmlBlockStartRegex =
      /^[ \t]{0,3}(?:<!--|<\/?[A-Za-z][\w:-]*(?:\s[^<>]*?)?\/?>[ \t]*$)/;

    // CommonMark type 6: these tags open a raw block even when other
    // content follows them on the same line.
    Instance.htmlBlockTagRegex = new RegExp(
      "^[ \\t]{0,3}</?(?:" + "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|pre|script|search|section|style|summary|table|tbody|td|textarea|tfoot|th|thead|title|tr|track|ul" + ")(?:[ \\t/>]|$)",
      "i"
    );

    // Does the text after a blank line still belong to the list above it?
    Instance.listItemRegex = /^[ \t]{0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/;
    Instance.indentedFenceRegex = /^[ \t]*(?:`{3,}|~{3,})/;
    Instance.listIndentRegex = /^(?:[ \t]{2,}|\t)/;
    Instance.listPartialRegex = /^[ \t]{0,3}(?:[-*+]|\d{1,9}[.)]?)?[ \t]*$/;

    // A list marker on a line by itself, with its item text still to come.
    // The marker may sit behind blockquote markers: "> 1.".
    Instance.markerOnlyRegex = /^[ \t>]*(?:[-*+]|\d{1,9}[.)]?)[ \t]*$/;
    Instance.nestedMarkerRegex =
      /((?:^|\n)[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+)(?:[-*+]|\d{1,9}[.)]?)[ \t]*$/;


    return Instance;
  }

  convertMath(mdBuffer, blockType) {
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

    function transformUnsafe(text) {
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

    function convertInlineOutsideMath(text) {
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
