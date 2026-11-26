/**
 * Prevent stale Safari/WebKit compositing and touch targets during phone rotation.
 * Keep the React tree mounted (forms, navigation, auth, and modal state survive).
 * The shell is removed from layout only in landscape, then laid out behind
 * an input-blocking notice until the portrait viewport has settled.
 */
const PHONE_LANDSCAPE = '(orientation: landscape) and (max-height: 600px) and (pointer: coarse)';
type Phase = 'landscape' | 'recovering' | null;

export function isPhoneLandscape(win: Window): boolean {
  if (!win.matchMedia('(pointer: coarse)').matches ||
      Math.min(win.screen.width, win.screen.height) > 600) return false;
  const angle = (win as Window & { orientation?: number }).orientation;
  // Legacy iOS orientation is independent of an on-screen keyboard.
  if (typeof angle === 'number') return Math.abs(angle) % 180 === 90;
  const type = win.screen.orientation?.type;
  if (type) return type.startsWith('landscape');
  return win.matchMedia(PHONE_LANDSCAPE).matches;
}

export function installRotationRecovery(shell: HTMLElement, win: Window = window): () => void {
  const root = shell.ownerDocument.documentElement;
  const doc = shell.ownerDocument;
  const media = win.matchMedia(PHONE_LANDSCAPE);
  const viewport = win.visualViewport;
  const screenOrientation = win.screen.orientation;
  let phase: Phase = null;
  let frame = 0;
  let disposed = false;

  const cancelPending = () => {
    win.cancelAnimationFrame(frame);
    frame = 0;
  };
  const setPhase = (next: Phase) => {
    if (phase === next) return;
    phase = next;
    if (next) {
      root.dataset.employeeRotation = next;
      shell.inert = true;
      const focused = doc.activeElement;
      if (focused && shell.contains(focused) && typeof (focused as HTMLElement).blur === 'function') (focused as HTMLElement).blur();
      // Cancel in-flight sheet drags before hiding their layout.
      doc.dispatchEvent(new Event('employee-rotation-reset'));
    } else {
      delete root.dataset.employeeRotation;
      shell.inert = false;
    }
  };
  const signature = () => [
    win.innerWidth, win.innerHeight, root.clientWidth, root.clientHeight,
    viewport?.width, viewport?.height, viewport?.scale, viewport?.offsetLeft,
    viewport?.offsetTop,
  ].join(':');

  // No fixed timeout: restore on the first stable portrait paint.
  // Orientation events can precede the actual viewport resize on iOS.
  const settle = () => {
    if (disposed) return;
    if (isPhoneLandscape(win)) {
      cancelPending();
      setPhase('landscape');
      return;
    }
    if (!phase || frame) return;
    setPhase('recovering');
    let previous: string | null = null;

    const checkFrame = () => {
      frame = 0;
      if (disposed) return;
      if (isPhoneLandscape(win)) { settle(); return; }

      // Do not release touch while the screen angle reports portrait but
      // WebKit still exposes landscape geometry. The focused input was
      // blurred at rotation start, so this also allows the keyboard to close.
      if (win.innerWidth > win.innerHeight || root.clientWidth > root.clientHeight) {
        previous = null;
        frame = win.requestAnimationFrame(checkFrame);
        return;
      }

      win.scrollTo(0, 0);
      shell.getBoundingClientRect();
      const current = signature();
      if (current === previous) {
        setPhase(null);
        return;
      }
      previous = current;
      frame = win.requestAnimationFrame(checkFrame);
    };

    frame = win.requestAnimationFrame(checkFrame);
  };

  const onResize = () => {
    if (phase || isPhoneLandscape(win)) settle();
  };
  const onOrientation = () => {
    if (!win.matchMedia('(pointer: coarse)').matches ||
        Math.min(win.screen.width, win.screen.height) > 600) return;
    // The orientation event may arrive before resize / safe-area updates.
    if (!phase) setPhase('recovering');
    settle();
  };
  win.addEventListener('orientationchange', onOrientation);
  win.addEventListener('resize', onResize);
  win.addEventListener('pageshow', onResize);
  viewport?.addEventListener('resize', onResize);
  viewport?.addEventListener('scroll', onResize);
  screenOrientation?.addEventListener?.('change', onOrientation);
  media.addEventListener?.('change', onResize);
  onResize();

  return () => {
    disposed = true;
    cancelPending();
    win.removeEventListener('orientationchange', onOrientation);
    win.removeEventListener('resize', onResize);
    win.removeEventListener('pageshow', onResize);
    viewport?.removeEventListener('resize', onResize);
    viewport?.removeEventListener('scroll', onResize);
    screenOrientation?.removeEventListener?.('change', onOrientation);
    media.removeEventListener?.('change', onResize);
    setPhase(null);
  };
}
