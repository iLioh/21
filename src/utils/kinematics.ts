import { clamp01 } from './math'

export interface KinematicState {
  progress: number
  elapsedTime: number
  travelSpeed: number
  departureBoost: number
  finalBoost: number
  boostAmount: number
  fovImpulse: number
  visualWarp: number
  journeyProgress: number
  intensity: number
}

// Hitos normalizados clave:
// 0.00 - 0.11: Campo en reposo
// 0.11 - 0.22: Impulso 1 (aceleración suave 0 -> 1.0)
// 0.22 - 0.65: Crucero a velocidad constante (1.0) (Tierra alejándose, espacio profundo, aparece el sol)
// 0.65 - 0.76: Impulso 2 (aceleración suave 1.0 -> 2.4 hacia el sol)
// 0.76 - 0.92: Desaceleración continua (2.4 -> 0) y reveal del girasol
// 0.92 - 1.00: Reposo final y mensaje
const P_FIELD = 0.11
const P_IMP1 = 0.22
const P_IMP2_START = 0.65
const P_IMP2_END = 0.76
const P_DECEL_END = 0.92
const TOTAL_SECONDS = 18.0

// Integrales analíticas de los tramos de velocidad para journeyProgress:
// Tramo 1 (0.11 -> 0.22): smoothstep(0, 1, u) * 1.0. Int = 0.11 * 0.5 = 0.055
const D1 = 0.11 * 1.0 * 0.5 // 0.055
// Tramo 2 (0.22 -> 0.65): velocidad constante 1.0. Int = 0.43
const D2 = D1 + 1.0 * (P_IMP2_START - P_IMP1) // 0.055 + 0.43 = 0.485
// Tramo 3 (0.65 -> 0.76): 1.0 + smoothstep(0, 1, u) * 1.4. Int = 0.11 * (1.0 + 0.7) = 0.187
const D3 = D2 + (P_IMP2_END - P_IMP2_START) * (1.0 + 1.4 * 0.5) // 0.485 + 0.187 = 0.672
// Tramo 4 (0.76 -> 0.92): 2.4 * (1 - smoothstep). Int = 0.16 * 2.4 * 0.5 = 0.192
const D_TOTAL = D3 + (P_DECEL_END - P_IMP2_END) * 2.4 * 0.5 // 0.672 + 0.192 = 0.864

export function computeKinematicsFromProgress(pRaw: number, reducedMotion = false): KinematicState {
  const p = clamp01(pRaw)
  const elapsedTime = p * TOTAL_SECONDS

  // 1. Velocidad física escalar de la cámara (continua, exactamente 2 aceleraciones)
  let travelSpeed = 0
  let distance = 0

  if (p <= P_FIELD) {
    travelSpeed = 0
    distance = 0
  } else if (p <= P_IMP1) {
    const u = (p - P_FIELD) / (P_IMP1 - P_FIELD)
    const smoothU = u * u * (3 - 2 * u)
    travelSpeed = smoothU * 1.0
    distance = (P_IMP1 - P_FIELD) * 1.0 * (u * u * u * (1 - 0.5 * u))
  } else if (p <= P_IMP2_START) {
    travelSpeed = 1.0
    distance = D1 + 1.0 * (p - P_IMP1)
  } else if (p <= P_IMP2_END) {
    const u = (p - P_IMP2_START) / (P_IMP2_END - P_IMP2_START)
    const smoothU = u * u * (3 - 2 * u)
    travelSpeed = 1.0 + smoothU * 1.4
    distance = D2 + (P_IMP2_END - P_IMP2_START) * (1.0 * u + 1.4 * (u * u * u * (1 - 0.5 * u)))
  } else if (p <= P_DECEL_END) {
    const w = (p - P_IMP2_END) / (P_DECEL_END - P_IMP2_END)
    const smoothW = w * w * (3 - 2 * w)
    travelSpeed = 2.4 * (1 - smoothW)
    distance = D3 + (P_DECEL_END - P_IMP2_END) * 2.4 * (w - (w * w * w * (1 - 0.5 * w)))
  } else {
    travelSpeed = 0
    distance = D_TOTAL
  }

  // 2. Envolvente visual para FOV (abre una sola vez con el impulso y estabiliza lentamente)
  // Sin zoom de rebote dentro de la misma aceleración
  let fov1 = 0
  if (p >= 0.11 && p <= 0.20) {
    const u = (p - 0.11) / 0.09
    fov1 = u * u * (3 - 2 * u)
  } else if (p > 0.20 && p <= 0.26) {
    fov1 = 1.0
  } else if (p > 0.26 && p <= 0.44) {
    const w = (p - 0.26) / 0.18
    fov1 = 1 - (w * w * (3 - 2 * w))
  }

  let fov2 = 0
  if (p >= 0.65 && p <= 0.74) {
    const u = (p - 0.65) / 0.09
    fov2 = u * u * (3 - 2 * u)
  } else if (p > 0.74 && p <= 0.78) {
    fov2 = 1.0
  } else if (p > 0.78 && p <= 0.92) {
    const w = (p - 0.78) / 0.14
    fov2 = 1 - (w * w * (3 - 2 * w))
  }

  const motionScale = reducedMotion ? 0.25 : 1.0
  const departureBoost = fov1 * motionScale
  const finalBoost = fov2 * motionScale
  const boostAmount = Math.max(departureBoost, finalBoost)
  const fovImpulse = boostAmount
  const visualWarp = finalBoost
  const journeyProgress = clamp01(distance / D_TOTAL)

  return {
    progress: p,
    elapsedTime,
    travelSpeed,
    departureBoost,
    finalBoost,
    boostAmount,
    fovImpulse,
    visualWarp,
    journeyProgress,
    intensity: boostAmount,
  }
}

export function computeKinematics(elapsedSeconds: number, reducedMotion = false): KinematicState {
  return computeKinematicsFromProgress(elapsedSeconds / TOTAL_SECONDS, reducedMotion)
}
