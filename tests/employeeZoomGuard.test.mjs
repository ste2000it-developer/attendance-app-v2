import test from 'node:test';
import assert from 'node:assert/strict';
import { installEmployeeZoomGuard } from '../src/domain/employeeZoomGuard.ts';

function moveWithFingers(fingers) {
  const event = new Event('touchmove', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: Array.from({ length: fingers }, () => ({})) });
  return event;
}

test('iPhone Safari pinch gestures are cancelled on every mounted employee page', () => {
  const page = new EventTarget();
  const cleanup = installEmployeeZoomGuard(page);

  const start = new Event('gesturestart', { cancelable: true });
  const change = new Event('gesturechange', { cancelable: true });
  const pinch = moveWithFingers(2);

  page.dispatchEvent(start);
  page.dispatchEvent(change);
  page.dispatchEvent(pinch);

  assert.equal(start.defaultPrevented, true);
  assert.equal(change.defaultPrevented, true);
  assert.equal(pinch.defaultPrevented, true);
  cleanup();
});

test('one finger scrolling and taps remain native, cleanup removes handlers', () => {
  const page = new EventTarget();
  const cleanup = installEmployeeZoomGuard(page);

  const swipe = moveWithFingers(1);
  page.dispatchEvent(swipe);
  assert.equal(swipe.defaultPrevented, false);

  cleanup();
  const nextPinch = moveWithFingers(2);
  const nextGesture = new Event('gesturestart', { cancelable: true });
  page.dispatchEvent(nextPinch);
  page.dispatchEvent(nextGesture);
  assert.equal(nextPinch.defaultPrevented, false);
  assert.equal(nextGesture.defaultPrevented, false);
});
