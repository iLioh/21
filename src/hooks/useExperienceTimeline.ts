import { useCallback, useRef, useState } from 'react'
import type { ExperiencePhase } from '../types/experience'
import type { KinematicState } from '../utils/kinematics'

export type TimelineState = KinematicState

const INITIAL_STATE: TimelineState = {
  progress: 0,
  elapsedTime: 0,
  travelSpeed: 0,
  departureBoost: 0,
  finalBoost: 0,
  boostAmount: 0,
  fovImpulse: 0,
  visualWarp: 0,
  journeyProgress: 0,
  intensity: 0,
}

export function useExperienceTimeline(_reducedMotion: boolean) {
  const [phase, setPhase] = useState<ExperiencePhase>('INTRO')
  const timelineState = useRef<TimelineState>({ ...INITIAL_STATE })
  const activeRef = useRef(false)
  const elapsedRef = useRef(0)

  const reset = useCallback(() => {
    activeRef.current = false
    elapsedRef.current = 0
    Object.assign(timelineState.current, INITIAL_STATE)
    setPhase('INTRO')
  }, [])

  const start = useCallback(() => {
    activeRef.current = true
    elapsedRef.current = 0
    Object.assign(timelineState.current, INITIAL_STATE)
    setPhase('ASCENDING')
  }, [])

  return {
    phase,
    timelineState,
    activeRef,
    elapsedRef,
    setPhase,
    start,
    reset,
  }
}

