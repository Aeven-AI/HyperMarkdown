import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactElement,
  type Ref,
} from "react";

import type { Instance, Placement, Props } from "tippy.js";

/** The callable tippy default export, however a resolver hands it over. */
type TippyFactory = (reference: Element, props: Partial<Props>) => Instance;

export interface TooltipProps {
  content?: string | undefined;
  placement?: Placement | undefined;
  trigger?: string | undefined;
  touch?: boolean | undefined;
  arrow?: boolean | undefined;
  children?: ReactElement<{ ref?: Ref<Element> }> | undefined;
}

export interface TooltipHandle {
  show(): void;
  hide(): void;
}

let factory: TippyFactory | null = null;
let pending: Promise<TippyFactory | null> | null = null;

/**
 * Find the callable tippy export inside whatever a resolver returns.
 *
 * tippy.js@6 publishes `main` (CommonJS) and `module` (ESM) and no `exports`
 * map, so the callable sits at a different depth per resolver: a bundler takes
 * the ESM build and the namespace's `default` is the function, while Node
 * takes the CommonJS build and wraps `module.exports` as that `default` — so
 * the function is one level further down, at `default.default`. Descend until
 * something is callable rather than guessing a depth.
 * @param module - the imported namespace, whatever its shape.
 * @returns the tippy factory, or null when no callable is reachable.
 */
function resolveFactory(module: unknown): TippyFactory | null {
  let candidate = module;

  // ESM default, CommonJS `default.default`, and the bare namespace between.
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof candidate === "function") {
      return candidate as TippyFactory;
    }
    if (typeof candidate !== "object" || candidate === null) {
      return null;
    }
    candidate = (candidate as { default?: unknown }).default;
  }

  return null;
}

/**
 * Load tippy.js on the first tooltip, once per module.
 *
 * tippy is optional and never imported at module load: a consumer that
 * installs it gets rich tooltips, and one that does not still renders every
 * toolbar with the native `title` the trigger already carries.
 * @returns the tippy factory, or null when the package is absent or exports no callable.
 */
function loadTippy(): Promise<TippyFactory | null> {
  if (factory) {
    return Promise.resolve(factory);
  }

  if (!pending) {
    pending = import("tippy.js")
      .then((module) => {
        factory = resolveFactory(module);
        if (!factory) {
          // Reachable but unusable: do not retry an import that resolved.
          return null;
        }
        return factory;
      })
      .catch(() => {
        // Absent or unloadable. Let a later tooltip retry; titles carry the
        // text until one succeeds.
        pending = null;
        return null;
      });
  }

  return pending;
}

/**
 * React adapter for tippy.js, matching the imperative show/hide surface the
 * renderer's toolbars use for their "copied" confirmations. It attaches the
 * reference through props, as required by React 19, instead of reading the
 * removed ReactElement.ref getter.
 *
 * Without tippy the imperative handle is inert and the trigger keeps its
 * native `title`, so every control stays named.
 */
const Tooltip = forwardRef<TooltipHandle, TooltipProps>(
  function Tooltip(props, ref) {
    const { content, placement, trigger, touch, arrow, children } = props;

    const manual = trigger === "manual";
    const instanceRef = useRef<Instance | null>(null);
    const referenceRef = useRef<Element | null>(null);
    // tippy arrives a microtask late, so creation reads the current props
    // rather than the ones captured when the effect was scheduled.
    const latest = useRef({ content, placement, touch, arrow, manual, trigger });
    latest.current = { content, placement, touch, arrow, manual, trigger };

    const setReference = useCallback((element: Element | null) => {
      referenceRef.current = element;
    }, []);

    useEffect(() => {
      const reference = referenceRef.current;

      if (!reference) {
        return;
      }

      let disposed = false;

      void loadTippy().then((create) => {
        if (disposed || !create) {
          return;
        }

        const current = latest.current;

        instanceRef.current = create(reference, {
          content: current.content ?? "",
          placement: current.placement ?? "top",
          touch: current.touch ?? true,
          arrow: current.arrow ?? true,
          trigger: current.manual
            ? "manual"
            : (current.trigger ?? "mouseenter"),
          appendTo: () => document.body,
          zIndex: 99999,
        });
      });

      return () => {
        disposed = true;
        instanceRef.current?.destroy();
        instanceRef.current = null;
      };
    }, []);

    useEffect(() => {
      instanceRef.current?.setProps({
        content: content ?? "",
        placement: placement ?? "top",
        touch: touch ?? true,
        arrow: arrow ?? true,
        trigger: manual ? "manual" : (trigger ?? "mouseenter"),
      });
    }, [arrow, content, manual, placement, touch, trigger]);

    useImperativeHandle(
      ref,
      () => ({
        show() {
          instanceRef.current?.show();
        },
        hide() {
          instanceRef.current?.hide();
        },
      }),
      [],
    );

    if (!children) {
      return null;
    }

    return cloneElement(children, { ref: setReference });
  },
);

Tooltip.displayName = "Tooltip";

export default Tooltip;
