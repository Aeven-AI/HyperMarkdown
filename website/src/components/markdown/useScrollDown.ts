import { useCallback, useEffect, useRef } from "react";

// Same threshold as ChatTest. Following stops once the reader is this far
// from the bottom, and it only resumes after they scroll back into it.
const SCROLL_MARGIN = 100;

export function useScrollDown(container: { current: HTMLElement | null }) {
  const userScroll = useRef(false);
  const currentScrollHeight = useRef(0);
  const lastScrollTop = useRef(0);
  const programmatic = useRef(false);

  const scrollDown = useCallback(() => {
    const el = container.current;

    if (!el || userScroll.current === true) {
      return;
    }

    if (currentScrollHeight.current === el.scrollHeight) {
      return;
    }

    programmatic.current = true;
    try {
      if (userScroll.current === true) {
        return;
      }
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
      currentScrollHeight.current = el.scrollHeight;
      lastScrollTop.current = el.scrollTop;
    } finally {
      programmatic.current = false;
    }
  }, [container]);

  const resetScroll = useCallback(() => {
    const el = container.current;
    userScroll.current = false;
    currentScrollHeight.current = 0;
    programmatic.current = true;
    try {
      el?.scrollTo({ top: 0, behavior: "instant" });
      lastScrollTop.current = el?.scrollTop ?? 0;
    } finally {
      programmatic.current = false;
    }
  }, [container]);

  useEffect(() => {
    const el = container.current;
    if (!el) {
      return;
    }

    lastScrollTop.current = el.scrollTop;

    const atBottom = () =>
      el.scrollTop + el.clientHeight > el.scrollHeight - SCROLL_MARGIN;

    const scrollDownListener = () => {
      const scrollTop = el.scrollTop;

      if (programmatic.current) {
        lastScrollTop.current = scrollTop;
        return;
      }

      const goingUp = scrollTop < lastScrollTop.current - 1;
      const goingDown = scrollTop > lastScrollTop.current + 1;
      lastScrollTop.current = scrollTop;

      // Interrupt on any user movement away from the end. Resume only after
      // the reader scrolls back down into the bottom margin — a small nudge
      // that is still "near" the end must not re-arm follow.
      if (goingUp || !atBottom()) {
        userScroll.current = true;
      } else if (goingDown && atBottom()) {
        userScroll.current = false;
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        userScroll.current = true;
      } else if (event.deltaY > 0 && atBottom()) {
        userScroll.current = false;
      }
    };

    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchY;
      if (y > touchY + 1) {
        userScroll.current = true;
      } else if (y < touchY - 1 && atBottom()) {
        userScroll.current = false;
      }
      touchY = y;
    };

    el.addEventListener("scroll", scrollDownListener, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      el.removeEventListener("scroll", scrollDownListener);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [container]);

  return { scrollDown, resetScroll };
}
