import test from 'node:test';
import assert from 'node:assert/strict';
import { installRotationRecovery, isPhoneLandscape } from '../src/domain/employeeRotationRecovery.ts';

function setup({ width = 402, height = 874, angle = 0, coarse = true } = {}) {
  const win = new EventTarget();
  const doc = new EventTarget();
  const root = { dataset: {}, clientWidth: width, clientHeight: height };
  doc.documentElement = root;
  doc.activeElement = null;
  const shell = { ownerDocument: doc, inert: false, contains: () => false, getBoundingClientRect: () => ({}) };
  const media = new EventTarget();
  const vv = new EventTarget();
  Object.assign(vv, { width, height, scale: 1, offsetLeft: 0, offsetTop: 0 });
  const timers = new Map(), frames = new Map();
  let id = 0;
  Object.assign(win, {
    innerWidth: width, innerHeight: height, orientation: angle,
    screen: { width, height }, visualViewport: vv,
    matchMedia: query => query === '(pointer: coarse)' ? { matches: coarse } : media,
    setTimeout: fn => { timers.set(++id, fn); return id; },
    clearTimeout: key => timers.delete(key),
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    scrollTo: () => {},
  });
  const flush = queue => { const jobs = [...queue.values()]; queue.clear(); for (const fn of jobs) fn(); };
  const rotate = (nextAngle, nextW, nextH) => {
    win.orientation = nextAngle;
    win.innerWidth = root.clientWidth = vv.width = nextW;
    win.innerHeight = root.clientHeight = vv.height = nextH;
    win.dispatchEvent(new Event('orientationchange'));
    win.dispatchEvent(new Event('resize'));
  };
  return { win, doc, root, shell, vv, timers, frames, rotate,
    settle: () => { flush(timers); flush(frames); flush(frames); },
    tick: () => flush(timers), frame: () => flush(frames) };
}

test('landscape blocks the shell; portrait keeps input inert until a stable layout', () => {
  const t = setup();
  const stop = installRotationRecovery(t.shell, t.win);
  assert.equal(t.shell.inert, false);
  t.rotate(90, 874, 402);
  assert.equal(t.root.dataset.employeeRotation, 'landscape');
  assert.equal(t.shell.inert, true);
  t.rotate(0, 402, 874);
  assert.equal(t.root.dataset.employeeRotation, 'recovering');
  assert.equal(t.shell.inert, true);
  t.tick(); t.frame();
  assert.equal(t.shell.inert, true);
  t.frame();
  assert.equal(t.shell.inert, false);
  assert.equal(t.root.dataset.employeeRotation, undefined);
  stop();
});

test('a second rotation cancels pending restoration', () => {
  const t = setup();
  const stop = installRotationRecovery(t.shell, t.win);
  t.rotate(90, 874, 402);
  t.rotate(0, 402, 874);
  t.tick(); t.frame();
  t.rotate(-90, 874, 402);
  t.settle();
  assert.equal(t.root.dataset.employeeRotation, 'landscape');
  assert.equal(t.shell.inert, true);
  t.rotate(0, 402, 874);
  t.vv.height = 800;
  t.vv.dispatchEvent(new Event('resize'));
  t.settle();
  assert.equal(t.shell.inert, false);
  stop();
});

test('initial landscape, cleanup, keyboard and desktop behavior', () => {
  const t = setup({ width: 874, height: 402, angle: 90 });
  const stop = installRotationRecovery(t.shell, t.win);
  assert.equal(t.shell.inert, true);
  stop();
  assert.equal(t.shell.inert, false);
  assert.equal(t.root.dataset.employeeRotation, undefined);
  const phone = setup();
  phone.win.innerHeight = 200;
  assert.equal(isPhoneLandscape(phone.win), false);
  const desktop = setup({ width: 1400, height: 800, angle: 90, coarse: false });
  assert.equal(isPhoneLandscape(desktop.win), false);
});
