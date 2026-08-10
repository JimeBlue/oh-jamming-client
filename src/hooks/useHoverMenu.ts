'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/* Long enough for the cursor to cross the gap between the trigger and the panel
   under it, short enough that the menu doesn't feel stuck open. Closing on
   mouseleave with no delay makes the menu impossible to actually reach. */
const CLOSE_DELAY_MS = 150;

/* Hover is only wired up on devices that genuinely hover.

   A tap on a touchscreen fires a synthetic mouseenter *before* the click, so
   wiring hover unconditionally would open the menu on the fake mouseenter and
   then immediately close it again on the click that follows — the menu would
   flash and vanish on every tap. Touch devices get tap-to-toggle instead. */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

const subscribeToPointerType = (onChange: () => void) => {
  const query = window.matchMedia(HOVER_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const getPointerSnapshot = () => window.matchMedia(HOVER_QUERY).matches;

/* There is no pointer to inspect while rendering on the server. False is the
   safe default: tap-to-toggle works on every device, hover is the enhancement
   that gets added once the real answer is known. */
const getPointerServerSnapshot = () => false;

/* The open/close mechanics behind the account menu: hover on a real pointer,
   tap on a touchscreen, and keyboard-reachable either way. */
export default function useHoverMenu() {
  const [open, setOpen] = useState(false);

  const canHover = useSyncExternalStore(
    subscribeToPointerType,
    getPointerSnapshot,
    getPointerServerSnapshot,
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    cancelScheduledClose();
    setOpen(true);
  }, [cancelScheduledClose]);

  const closeMenu = useCallback(() => {
    cancelScheduledClose();
    setOpen(false);
  }, [cancelScheduledClose]);

  const toggleMenu = useCallback(() => {
    cancelScheduledClose();
    setOpen((isOpen) => !isOpen);
  }, [cancelScheduledClose]);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelScheduledClose]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    /* pointerdown rather than click, so the menu is already gone by the time the
       press completes — and unlike mousedown it fires for touch too. */
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeMenu();
    };

    /* Tabbing past the last item closes the panel, so a keyboard user doesn't
       leave an open menu floating behind them. */
    const onFocusIn = (event: FocusEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeMenu();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, closeMenu]);

  /* A pending close timer firing after unmount would set state on a dead
     component. */
  useEffect(() => cancelScheduledClose, [cancelScheduledClose]);

  return {
    open,
    canHover,
    containerRef,
    openMenu,
    closeMenu,
    toggleMenu,
    scheduleClose,
  };
}
