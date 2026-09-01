import { useCallback, useEffect, useRef } from "react";

// Same threshold as ChatTest: the reader may drift this far from the bottom
// before following stops, and following resumes once they are back inside it.
const SCROLL_MARGIN = 100;

export function useScrollDown(container: { current: HTMLElement | null }) {
  const userScroll = useRef(false);
  const currentScrollHeight = useRef(0);

  const scrollDown = useCallback(() => {
    const el = container.current;

    if (!el || userScroll.current === true) {
      return;
    }

    if (currentScrollHeight.current === el.scrollHeight) {
      return;
    }

    // Instant, not smooth: the pane uses CSS scroll-behavior: smooth for the
    // reader, and a queued animation would be invalidated by the next chunk.
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
    currentScrollHeight.current = el.scrollHeight;
  }, [container]);

  const resetScroll = useCallback(() => {
    userScroll.current = false;
    currentScrollHeight.current = 0;
    container.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [container]);

  useEffect(() => {
    const el = container.current;
    if (!el) {
      return;
    }

    const scrollDownListener = () => {
      const { scrollTop, clientHeight, scrollHeight } = el;

      if (scrollTop + clientHeight <= scrollHeight - SCROLL_MARGIN) {
        userScroll.current = true;
      } else {
        userScroll.current = false;
      }
    };

    // Wheel/touch mark intent immediately so a fast stream cannot yank the
    // viewport back before the 100px threshold is crossed.
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        userScroll.current = true;
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
