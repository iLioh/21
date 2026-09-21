export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const x = clamp01((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}

export function rangeProgress(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start))
}
