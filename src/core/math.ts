import type { Vec3 } from './types'

export const clone = <T>(value: T): T => structuredClone(value)
export const distance = (a: Vec3, b: Vec3): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
export const planarDistance = (a: Vec3, b: Vec3): number =>
  Math.hypot(a[0] - b[0], a[2] - b[2])
export const addScaled = (a: Vec3, b: Vec3, dt: number): Vec3 => [
  a[0] + b[0] * dt,
  a[1] + b[1] * dt,
  a[2] + b[2] * dt,
]
export const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n))

/** Open segment versus axis-aligned box. Sensing panels and walls are axis aligned. */
export function segmentIntersectsBox(
  from: Vec3,
  to: Vec3,
  center: Vec3,
  half: Vec3,
): boolean {
  let near = 0.0001
  let far = 0.9999
  for (let axis = 0; axis < 3; axis++) {
    const delta = to[axis] - from[axis]
    const lo = center[axis] - half[axis]
    const hi = center[axis] + half[axis]
    if (Math.abs(delta) < 1e-9) {
      if (from[axis] < lo || from[axis] > hi) return false
    } else {
      const a = (lo - from[axis]) / delta
      const b = (hi - from[axis]) / delta
      near = Math.max(near, Math.min(a, b))
      far = Math.min(far, Math.max(a, b))
      if (near > far) return false
    }
  }
  return true
}
