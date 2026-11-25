/**
 * Keep the employee time-clock viewport at its intended scale on touch devices.
 *
 * WebKit on iOS intentionally ignores user-scalable=no for pinch gestures.
 * Intercept Safari's non-standard gesture events and two-finger touch moves,
 * while leaving ordinary one-finger taps, vertical scrolling and sheet swipes
 * untouched. The guard is mounted only by the employee App, not HR Admin.
 */
export function installEmployeeZoomGuard(target: Document): () => void {
  const stopZoom = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  const stopPinch = (event: TouchEvent) => {
    if (event.touches.length > 1 && event.cancelable) event.preventDefault();
  };

  target.addEventListener('gesturestart', stopZoom, { passive: false });
  target.addEventListener('gesturechange', stopZoom, { passive: false });
  target.addEventListener('touchmove', stopPinch, { passive: false, capture: true });

  return () => {
    target.removeEventListener('gesturestart', stopZoom);
    target.removeEventListener('gesturechange', stopZoom);
    target.removeEventListener('touchmove', stopPinch, true);
  };
}
