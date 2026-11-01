import type { AuthMode } from '../types';

export const AUTH_FLIGHT_MS = 1800;
export const AUTH_FADE_MS = 180;
export type Point3 = readonly [number, number, number];
export interface AuthFlight {
  mode: AuthMode;
  target: AuthMode;
  startedAt: number | null;
}

export function idleFlight(mode: AuthMode): AuthFlight {
  return { mode, target: mode, startedAt: null };
}

export function beginFlight(state: AuthFlight, target: AuthMode, now: number, animate: boolean): AuthFlight {
  if (state.startedAt !== null || state.mode === target) return state;
  return animate ? { ...state, target, startedAt: now } : idleFlight(target);
}

export function completeFlight(state: AuthFlight, startedAt: number): AuthFlight {
  return state.startedAt === startedAt ? idleFlight(state.target) : state;
}

export function sampleFlight(state: AuthFlight, now: number): { progress: number; done: boolean } {
  const from = state.mode === 'login' ? 0 : 1;
  if (state.startedAt === null) return { progress: from, done: false };
  const p = Math.min(1, Math.max(0, (now - state.startedAt) / AUTH_FLIGHT_MS));
  const t = p * p * (3 - 2 * p);
  return { progress: from + ((state.target === 'login' ? 0 : 1) - from) * t, done: p === 1 };
}

export function samplePose(progress: number): { eye: Point3; lookAt: Point3 } {
  const lift = Math.sin(Math.PI * progress);
  return { eye: [-13 + 26 * progress, 0.8 + 0.1 * lift, 3 + 0.2 * lift], lookAt: [-8 + 16 * progress, 0, 0] };
}
