import { expect, test } from 'bun:test';
import { beginFlight, completeFlight, idleFlight, sampleFlight, samplePose } from './flight';

test('starts once and ignores repeated requests', () => {
  const idle = idleFlight('login');
  const trip = beginFlight(idle, 'signup', 1000, true);
  expect(trip).toEqual({ mode: 'login', target: 'signup', startedAt: 1000 });
  expect(beginFlight(idle, 'login', 1000, true)).toBe(idle);
  expect(beginFlight(trip, 'login', 1100, true)).toBe(trip);
});

test('samples forward and reverse with the same easing', () => {
  const trip = beginFlight(idleFlight('login'), 'signup', 1000, true);
  expect(sampleFlight(trip, 1000)).toEqual({ progress: 0, done: false });
  expect(sampleFlight(trip, 1900)).toEqual({ progress: 0.5, done: false });
  expect(sampleFlight(trip, 2800)).toEqual({ progress: 1, done: true });
  expect(sampleFlight(trip, 1450).progress).toBeCloseTo(0.15625);
  const back = beginFlight(idleFlight('signup'), 'login', 4000, true);
  expect(sampleFlight(back, 4900)).toEqual({ progress: 0.5, done: false });
  expect(sampleFlight(back, 5350).progress).toBeCloseTo(0.15625);
  expect(sampleFlight(back, 5800)).toEqual({ progress: 0, done: true });
});

test('commits only the current trip', () => {
  const trip = beginFlight(idleFlight('login'), 'signup', 1000, true);
  expect(completeFlight(trip, 999)).toBe(trip);
  const signup = completeFlight(trip, 1000);
  expect(signup).toEqual({ mode: 'signup', target: 'signup', startedAt: null });
  expect(sampleFlight(signup, 12000)).toEqual({ progress: 1, done: false });
  const back = beginFlight(signup, 'login', 4000, true);
  expect(completeFlight(back, 1000)).toBe(back);
  expect(completeFlight(back, 4000)).toEqual({ mode: 'login', target: 'login', startedAt: null });
});

test('switches immediately without animation', () => {
  expect(beginFlight(idleFlight('login'), 'signup', 1000, false))
    .toEqual({ mode: 'signup', target: 'signup', startedAt: null });
});

test('finishes after a long frame gap', () => {
  const trip = beginFlight(idleFlight('login'), 'signup', 1000, true);
  expect(sampleFlight(trip, 12000)).toEqual({ progress: 1, done: true });
});

test('reproduces close-flight camera poses', () => {
  expect(samplePose(0)).toEqual({ eye: [-13, 0.8, 3], lookAt: [-8, 0, 0] });
  expect(samplePose(1).eye[0]).toBe(13);
  expect(samplePose(1).lookAt).toEqual([8, 0, 0]);
  expect(samplePose(0.5).eye[0]).toBe(0);
  expect(samplePose(0.5).eye[1]).toBeCloseTo(0.9);
  expect(samplePose(0.5).eye[2]).toBeCloseTo(3.2);
  expect(samplePose(0.5).lookAt).toEqual([0, 0, 0]);
});
