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

import tippy, { type Instance, type Placement } from "tippy.js";

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

/**
 * React adapter for tippy.js, matching the imperative show/hide surface the
 * renderer's toolbars use for their "copied" confirmations. It attaches the
 * reference through props, as required by React 19, instead of reading the
 * removed ReactElement.ref getter.
 */
const Tooltip = forwardRef<TooltipHandle, TooltipProps>(
  function Tooltip(props, ref) {
    const { content, placement, trigger, touch, arrow, children } = props;

    const manual = trigger === "manual";
    const instanceRef = useRef<Instance | null>(null);
    const referenceRef = useRef<Element | null>(null);

    const setReference = useCallback((element: Element | null) => {
      referenceRef.current = element;
    }, []);

    useEffect(() => {
      let instance: Instance;

      const reference = referenceRef.current;

      if (!reference) {
        return;
      }

      instance = tippy(reference, {
        content: content ?? "",
        placement: placement ?? "top",
        touch: touch ?? true,
        arrow: arrow ?? true,
        trigger: manual ? "manual" : (trigger ?? "mouseenter"),
      });
      instanceRef.current = instance;

      return () => {
        instance.destroy();
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
