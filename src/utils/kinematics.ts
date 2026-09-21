import { TIMELINE_MILESTONES } from '../config/experience'
import { clamp01 } from './math'

export interface KinematicState {
  progress: number
  elapsedTime: number
  travelSpeed: number
  departureBoost: number
  finalBoost: number
  boostAmount: number
  journeyProgress: number
  intensity: number
}

const T_FIELD = TIMELINE_MILESTONES.fieldEnd // 2.0
const T_IMPULSE1 = TIMELINE_MILESTONES.impulse1End // 3.6
const T_IMPULSE2_START = TIMELINE_MILESTONES.impulse2Start // 11.3
const T_IMPULSE2_END = TIMELINE_MILESTONES.impulse2End // 12.6
const T_DECEL_END = TIMELINE_MILESTONES.sunflowerRevealEnd // 16.5
const T_TOTAL = TIMELINE_MILESTONES.totalDuration // 18.0

const DUR_IMP1 = T_IMPULSE1 - T_FIELD // 1.6
const DUR_CRUISE = T_IMPULSE2_START - T_IMPULSE1 // 7.7
const DUR_IMP2 = T_IMPULSE2_END - T_IMPULSE2_START // 1.3
const DUR_DECEL = T_DECEL_END - T_IMPULSE2_END // 3.9

const S_IMP1_END = DUR_IMP1 * 1.0 * 0.5 // 0.8
const S_CRUISE_END = S_IMP1_END + 1.0 * DUR_CRUISE // 8.5
const S_IMP2_END = S_CRUISE_END + DUR_IMP2 * (1.0 + 1.4 * 0.5) // 10.71
const S_TOTAL = S_IMP2_END + DUR_DECEL * 2.4 * 0.5 // 15.39

export function computeKinematics(elapsedSeconds: number, reducedMotion = false): KinematicState {
  const t = Math.max(0, elapsedSeconds)
  const progress = clamp01(t / T_TOTAL)

  let travelSpeed = 0
  let departureBoost = 0
  let finalBoost = 0
  let distance = 0

  if (t <= T_FIELD) {
    // Fase 1: Campo en reposo
    travelSpeed = 0
    departureBoost = 0
    finalBoost = 0
    distance = 0
  } else if (t <= T_IMPULSE1) {
    // Fase 2: Primer impulso (0 -> 1.0)
    const u = (t - T_FIELD) / DUR_IMP1
    const smoothU = u * u * (3 - 2 * u)
    travelSpeed = smoothU * 1.0
    departureBoost = Math.sin(u * Math.PI)
    finalBoost = 0
    distance = DUR_IMP1 * 1.0 * (u * u * u * (1 - 0.5 * u))
  } else if (t <= T_IMPULSE2_START) {
    // Fases 3, 4, 5: Crucero constante a 1.0 (Tierra alejándose, crucero interestelar, aparece la luz)
    travelSpeed = 1.0
    departureBoost = 0
    finalBoost = 0
    distance = S_IMP1_END + 1.0 * (t - T_IMPULSE1)
  } else if (t <= T_IMPULSE2_END) {
    // Fase 6: Segundo impulso final (1.0 -> 2.4)
    const u = (t - T_IMPULSE2_START) / DUR_IMP2
    const smoothU = u * u * (3 - 2 * u)
    travelSpeed = 1.0 + smoothU * 1.4
    departureBoost = 0
    finalBoost = Math.sin(u * Math.PI)
    distance = S_CRUISE_END + DUR_IMP2 * (1.0 * u + 1.4 * (u * u * u * (1 - 0.5 * u)))
  } else if (t <= T_DECEL_END) {
    // Fase 7: Aproximación y desaceleración continua (2.4 -> 0)
    const w = (t - T_IMPULSE2_END) / DUR_DECEL
    const smoothW = w * w * (3 - 2 * w)
    travelSpeed = 2.4 * (1 - smoothW)
    departureBoost = 0
    finalBoost = 0
    distance = S_IMP2_END + DUR_DECEL * 2.4 * (w - (w * w * w * (1 - 0.5 * w)))
  } else {
    // Reposo final en el girasol
    travelSpeed = 0
    departureBoost = 0
    finalBoost = 0
    distance = S_TOTAL
  }

  const rawBoost = Math.max(departureBoost, finalBoost)
  const boostAmount = rawBoost * (reducedMotion ? 0.25 : 1.0)
  const journeyProgress = clamp01(distance / S_TOTAL)

  return {
    progress,
    elapsedTime: t,
    travelSpeed,
    departureBoost: departureBoost * (reducedMotion ? 0.25 : 1.0),
    finalBoost: finalBoost * (reducedMotion ? 0.25 : 1.0),
    boostAmount,
    journeyProgress,
    intensity: boostAmount,
  }
}

export function computeKinematicsFromProgress(progress: number, reducedMotion = false): KinematicState {
  return computeKinematics(progress * T_TOTAL, reducedMotion)
}
