/**
 * TeX delimiters as a micromark syntax extension, reusing the token vocabulary
 * `micromark-extension-math` already defines.
 *
 * `remark-math` understands only `$` and `$$`. Models also emit `\\(…\\)` and
 * `\\[…\\]`, and put a `$$…$$` display block on one line. Recognising those by
 * rewriting the source before parsing cannot work: `\\[see notes\\]` is
 * markdown's own escape for a literal bracket, an escaped `\\\\[` is a
 * backslash followed by one, and whether a display block may interrupt a
 * paragraph or sit in a table cell is a question about parse state rather than
 * about the characters. Deciding it inside the tokenizer answers all three
 * from the same place the rest of the syntax is decided.
 *
 * The emitted tokens are `micromark-extension-math`'s own, so `remark-math`
 * compiles them to standard math nodes and nothing downstream needs to know
 * this extension ran.
 */

import { factorySpace } from "micromark-factory-space";
import type {} from "micromark-extension-math";
import { markdownLineEnding } from "micromark-util-character";
import { codes, constants, types } from "micromark-util-symbol";
import type {
  Construct,
  Extension,
  Previous,
  State,
  Tokenizer,
} from "micromark-util-types";
import type { Processor } from "unified";

 

const previousBackslash: Previous = function (code) {
  if (code !== codes.backslash) return true
  const tail = this.events.at(-1)
  /* v8 ignore next -- a previous code necessarily has a preceding event. */
  if (tail === undefined) return false
  return tail[1].type === types.characterEscape
}

const tokenizeBackslashMathText: Tokenizer = function (effects, ok, nok) {
  return start

  function start(code: number | null): State | undefined {
    /* v8 ignore next -- the text construct is dispatched only for a backslash. */
    if (code !== codes.backslash) return nok(code)
    effects.enter('mathText')
    effects.enter('mathTextSequence')
    effects.consume(code)
    return open
  }

  function open(code: number | null): State | undefined {
    if (code !== codes.leftParenthesis) return nok(code)
    effects.consume(code)
    effects.exit('mathTextSequence')
    return between
  }

  function between(code: number | null): State | undefined {
    if (code === codes.eof) return nok(code)
    if (code === codes.backslash) {
      return effects.attempt({ partial: true, tokenize: tokenizeClose }, close, afterCloseAttempt)(code)
    }
    if (markdownLineEnding(code)) {
      effects.enter(types.lineEnding)
      effects.consume(code)
      effects.exit(types.lineEnding)
      return between
    }
    return dataStart(code)
  }

  function afterCloseAttempt(code: number | null): State | undefined {
    return effects.check({ partial: true, tokenize: tokenizeOpen }, nok, dataStart)(code)
  }

  function dataStart(code: number | null): State | undefined {
    effects.enter('mathTextData')
    effects.consume(code)
    return code === codes.backslash ? afterDataBackslash : data
  }

  function afterDataBackslash(code: number | null): State | undefined {
    if (code === codes.backslash) {
      effects.consume(code)
      return data
    }
    return data(code)
  }

  function data(code: number | null): State | undefined {
    if (code === codes.eof || code === codes.backslash || markdownLineEnding(code)) {
      effects.exit('mathTextData')
      return between(code)
    }
    effects.consume(code)
    return data
  }

  function close(code: number | null): State | undefined {
    effects.exit('mathText')
    return ok(code)
  }

  function tokenizeClose(closeEffects: Parameters<Tokenizer>[0], closeOk: State, closeNok: State): State {
    return slash

    function slash(code: number | null): State | undefined {
      /* v8 ignore next -- this partial construct is attempted only at a backslash. */
      if (code !== codes.backslash) return closeNok(code)
      closeEffects.enter('mathTextSequence')
      closeEffects.consume(code)
      return parenthesis
    }

    function parenthesis(code: number | null): State | undefined {
      if (code !== codes.rightParenthesis) return closeNok(code)
      closeEffects.consume(code)
      closeEffects.exit('mathTextSequence')
      return closeOk
    }
  }

  function tokenizeOpen(openEffects: Parameters<Tokenizer>[0], openOk: State, openNok: State): State {
    return slash

    function slash(code: number | null): State | undefined {
      /* v8 ignore next -- the opening check follows a failed close attempt at a backslash. */
      if (code !== codes.backslash) return openNok(code)
      openEffects.enter(types.chunkString)
      openEffects.consume(code)
      return parenthesis
    }

    function parenthesis(code: number | null): State | undefined {
      if (code !== codes.leftParenthesis) return openNok(code)
      openEffects.consume(code)
      openEffects.exit(types.chunkString)
      return openOk
    }
  }
}

/** A code point as text, for the body a same-line bracket block accumulates. */
function stringifyCode(code: number | null): string {
  /* v8 ignore next -- every caller has already refused eof, so code is a character. */
  return code === null ? '' : String.fromCharCode(code)
}

/**
 * Whether a same-line `\[…\]` body reads as maths.
 *
 * `\[` is also markdown's escape for a literal bracket, so `\[see notes\]`
 * is prose that happens to be bracketed. Multi-line and container forms are
 * unambiguous — nobody escapes a bracket across a line ending — so only the
 * one-line case is asked this question.
 * @param body - text between the delimiters.
 * @returns true when the body carries syntax only maths would.
 */
function looksLikeBracketMath(body: string): boolean {
  const jsonValue = /^(?:\{|"|true\b|false\b|null\b)/
  const mathSyntax = /\\[A-Za-z]+|[=^_]|[A-Za-z0-9})]\s*[+*/-]\s*[A-Za-z0-9({]/
  const trimmed = body.trim()

  if (trimmed === '' || jsonValue.test(trimmed)) {
    return false
  }

  return mathSyntax.test(trimmed)
}

function createMathFlow(marker: number, openMarker: number, closeMarker: number, multiline: boolean): Construct {
  const tokenize: Tokenizer = function (effects, ok, nok) {
    const self = this
    let oddBackslashRun = false
    let sawLineEnding = false
    let body = ''
    const tail = self.events.at(-1)
    const initialSize = tail?.[1].type === types.linePrefix
      ? tail[2].sliceSerialize(tail[1], true).length
      : 0

    return start

    function start(code: number | null): State | undefined {
      /* v8 ignore next -- the flow construct is dispatched only for its marker. */
      if (code !== marker) return nok(code)
      effects.enter('mathFlow')
      effects.enter('mathFlowFence')
      effects.enter('mathFlowFenceSequence')
      effects.consume(code)
      return open
    }

    function open(code: number | null): State | undefined {
      if (code !== openMarker) return nok(code)
      effects.consume(code)
      effects.exit('mathFlowFenceSequence')
      effects.exit('mathFlowFence')
      return marker === codes.dollarSign ? afterDollarOpen : content
    }

    function afterDollarOpen(code: number | null): State | undefined {
      return code === codes.dollarSign ? nok(code) : content(code)
    }

    function content(code: number | null): State | undefined {
      if (code === codes.eof) return nok(code)
      if (code === marker && (marker !== codes.dollarSign || !oddBackslashRun)) {
        return effects.attempt(
          { partial: true, tokenize: tokenizeClosingFence },
          closed,
          afterClosingFenceAttempt,
        )(code)
      }
      if (markdownLineEnding(code)) {
        sawLineEnding = true
        // Only the dollar instantiation is single-line, and remark-math's own
        // constructs claim any "$$" that does not close on its line, so this
        // one never reaches a line ending.
        /* v8 ignore next 3 */
        return multiline
          ? effects.attempt(nonLazyContinuation, afterContinuation, nok)(code)
          : nok(code)
      }
      return valueStart(code)
    }

    function afterClosingFenceAttempt(code: number | null): State | undefined {
      // Reached when a close attempt fails mid-body. For the dollar
      // instantiation that means input remark-math has already claimed, so the
      // backslash arm is the one that runs.
      /* v8 ignore next 3 */
      return marker === codes.backslash
        ? effects.check({ partial: true, tokenize: tokenizeOpeningFence }, nok, markerValueStart)(code)
        : markerValueStart(code)
    }

    function afterContinuation(code: number | null): State | undefined {
      return effects.attempt(
        { partial: true, tokenize: tokenizeClosingFence },
        closed,
        initialSize
          ? factorySpace(effects, content, types.linePrefix, initialSize + 1)
          : content,
      )(code)
    }

    function valueStart(code: number | null): State | undefined {
      effects.enter('mathFlowValue')
      oddBackslashRun = code === codes.backslash
      body += stringifyCode(code)
      effects.consume(code)
      return value
    }

    function markerValueStart(code: number | null): State | undefined {
      effects.enter('mathFlowValue')
      oddBackslashRun = false
      body += stringifyCode(code)
      effects.consume(code)
      return valueAfterMarker
    }

    function valueAfterMarker(code: number | null): State | undefined {
      if (code === marker) {
        body += stringifyCode(code)
        effects.consume(code)
        return value
      }
      return value(code)
    }

    function value(code: number | null): State | undefined {
      if (code === codes.eof || code === marker || markdownLineEnding(code)) {
        effects.exit('mathFlowValue')
        return content(code)
      }
      oddBackslashRun = code === codes.backslash ? !oddBackslashRun : false
      body += stringifyCode(code)
      effects.consume(code)
      return value
    }

    function closed(code: number | null): State | undefined {
      // Only the one-line bracket form is ambiguous with markdown's escape, and
      // only there is the body judged. Dollars, and any bracket block that
      // spans lines, close on their delimiters alone.
      if (
        marker === codes.backslash &&
        !sawLineEnding &&
        !looksLikeBracketMath(body)
      ) {
        return nok(code)
      }

      effects.exit('mathFlow')
      return ok(code)
    }

    function tokenizeClosingFence(
      closeEffects: Parameters<Tokenizer>[0],
      closeOk: State,
      closeNok: State,
    ): State {
      return factorySpace(closeEffects, sequenceStart, types.linePrefix, constants.tabSize)

      function sequenceStart(code: number | null): State | undefined {
        if (code !== marker) return closeNok(code)
        closeEffects.enter('mathFlowFence')
        closeEffects.enter('mathFlowFenceSequence')
        closeEffects.consume(code)
        return sequenceEnd
      }

      function sequenceEnd(code: number | null): State | undefined {
        if (code !== closeMarker) return closeNok(code)
        closeEffects.consume(code)
        closeEffects.exit('mathFlowFenceSequence')
        return factorySpace(closeEffects, after, types.whitespace)
      }

      function after(code: number | null): State | undefined {
        if (code !== codes.eof && !markdownLineEnding(code)) return closeNok(code)
        closeEffects.exit('mathFlowFence')
        return closeOk(code)
      }
    }

    function tokenizeOpeningFence(
      openEffects: Parameters<Tokenizer>[0],
      openOk: State,
      openNok: State,
    ): State {
      return sequenceStart

      function sequenceStart(code: number | null): State | undefined {
        /* v8 ignore next -- the opening check follows a failed close attempt at the marker. */
        if (code !== marker) return openNok(code)
        openEffects.enter(types.chunkString)
        openEffects.consume(code)
        return sequenceEnd
      }

      function sequenceEnd(code: number | null): State | undefined {
        if (code !== openMarker) return openNok(code)
        openEffects.consume(code)
        openEffects.exit(types.chunkString)
        return openOk
      }
    }
  }

  return {
    concrete: true,
    name: marker === codes.dollarSign ? 'sameLineDollarMathFlow' : 'backslashMathFlow',
    tokenize,
  }
}

const tokenizeNonLazyContinuation: Tokenizer = function (effects, ok, nok) {
  const self = this

  return start

  function start(code: number | null): State | undefined {
    /* v8 ignore next -- continuation constructs are attempted only after a line ending. */
    if (code === codes.eof) return ok(code)
    /* v8 ignore next -- continuation constructs are attempted only after a line ending. */
    if (!markdownLineEnding(code)) return nok(code)
    effects.enter(types.lineEnding)
    effects.consume(code)
    effects.exit(types.lineEnding)
    return lineStart
  }

  function lineStart(code: number | null): State | undefined {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code)
  }
}

const nonLazyContinuation: Construct = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation,
}

const backslashMathText: Construct = {
  name: 'backslashMathText',
  previous: previousBackslash,
  tokenize: tokenizeBackslashMathText,
}

const backslashMathFlow = createMathFlow(
  codes.backslash,
  codes.leftSquareBracket,
  codes.rightSquareBracket,
  true,
)

const sameLineDollarMathFlow = createMathFlow(
  codes.dollarSign,
  codes.dollarSign,
  codes.dollarSign,
  false,
)

const backslashMath: Extension = {
  flow: {
    [codes.backslash]: backslashMathFlow,
    [codes.dollarSign]: sameLineDollarMathFlow,
  },
  text: { [codes.backslash]: backslashMathText },
}

/**
 * TeX backslash delimiters and same-line display-dollar blocks as a micromark
 * syntax extension reusing `micromark-extension-math`'s token vocabulary; the
 * caller must also register `math()` on the same parse so the emitted tokens
 * compile to standard math nodes.
 * @returns The micromark syntax extension.
 */
export function mathCompatibility(): Extension {
  return backslashMath
}

/**
 * Register {@link mathCompatibility} on a remark pipeline.
 *
 * `remark-math` contributes both its own micromark extension and the
 * mdast handlers that turn math tokens into nodes; this only adds the
 * extra delimiters to the same parse, so it must run beside it rather
 * than instead of it.
 * @returns The remark plugin.
 */
export function remarkMathCompatibility(this: Processor): undefined {
  const data = this.data() as {
    micromarkExtensions?: Extension[];
  };
  const extensions = data.micromarkExtensions ?? (data.micromarkExtensions = []);

  extensions.push(mathCompatibility());

  return undefined;
}
