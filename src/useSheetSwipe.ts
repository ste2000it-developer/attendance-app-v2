import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

type Gesture = { pointerId: number; startY: number; lastY: number; startTime: number };

/** Dismiss a bottom sheet by dragging its marked handle or heading downward. */
export function useSheetSwipe(onDismiss: () => void, disabled = false) {
  const gestureRef = useRef<Gesture | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-sheet-drag]') ||
      target.closest('button, a, input, textarea, select, [role="button"]')) return;
    const sheet = event.currentTarget;
    if (sheet.getAnimations().some((animation) => animation.playState === 'running')) return;
    sheet.style.transition = 'none';
    gestureRef.current = {
      pointerId: event.pointerId, startY: event.clientY,
      lastY: 0, startTime: performance.now(),
    };
    sheet.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const sheet = event.currentTarget;
    gesture.lastY = Math.max(0, event.clientY - gesture.startY);
    sheet.style.transform = 'translate3d(0,' + gesture.lastY + 'px,0)';
  };

  const finish = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    const sheet = event.currentTarget;
    const distance = gesture.lastY;
    const duration = Math.max(1, performance.now() - gesture.startTime);
    if (!cancelled && (distance > 100 || (distance > 48 && distance / duration > .55))) {
      sheet.style.setProperty('--calendar-drag-start', distance + 'px');
      sheet.style.transition = '';
      sheet.style.transform = '';
      onDismiss();
      return;
    }
    sheet.style.transition = 'transform 210ms cubic-bezier(.2,.85,.2,1)';
    sheet.style.transform = 'translate3d(0,0,0)';
    sheet.addEventListener('transitionend', (transitionEvent) => {
      if (transitionEvent.target !== sheet || (transitionEvent as TransitionEvent).propertyName !== 'transform') return;
      sheet.style.transition = '';
      sheet.style.transform = '';
    }, { once: true });
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => finish(event, false),
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => finish(event, true),
  };
}
