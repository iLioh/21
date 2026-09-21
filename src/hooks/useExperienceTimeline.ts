import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { timelineConfig } from '../config/experience'
import type { ExperiencePhase } from '../types/experience'
import { computeKinematics, type KinematicState } from '../utils/kinematics'

export type TimelineState = KinematicState

const INITIAL_STATE: TimelineState = {
  progress: 0,
  elapsedTime: 0,
  travelSpeed: 0,
  departureBoost: 0,
  finalBoost: 0,
  boostAmount: 0,
  journeyProgress: 0,
  intensity: 0,
}

export function useExperienceTimeline(reducedMotion: boolean) {
  const [phase, setPhase] = useState<ExperiencePhase>('INTRO')
  const timelineState = useRef<TimelineState>({ ...INITIAL_STATE })
  const timeline = useRef<gsap.core.Timeline | null>(null)

  const reset = useCallback(() => {
    timeline.current?.kill()
    Object.assign(timelineState.current, INITIAL_STATE)
    setPhase('INTRO')
  }, [])

  const start = useCallback(() => {
    timeline.current?.kill()
    Object.assign(timelineState.current, INITIAL_STATE)
    const pace = reducedMotion ? 1.3 : 1
    const total = timelineConfig.finalEnd * pace
    const at = (seconds: number) => seconds * pace

    const driver = { time: 0 }

    setPhase('ASCENDING')
    timeline.current = gsap.timeline({ defaults: { ease: 'none' } })
      .to(driver, {
        time: total,
        duration: total,
        ease: 'none',
        onUpdate: () => {
          const effectiveTime = driver.time / pace
          const state = computeKinematics(effectiveTime, reducedMotion)
          Object.assign(timelineState.current, state)
        },
      }, 0)
      .call(() => setPhase('SPACE'), [], at(timelineConfig.ascendEnd))
      .call(() => setPhase('WARP'), [], at(timelineConfig.spaceEnd))
      .call(() => setPhase('APPROACH'), [], at(timelineConfig.warpEnd))
      .call(() => setPhase('REVEAL'), [], at(timelineConfig.approachEnd))
      .call(() => setPhase('FINAL'), [], at(timelineConfig.revealEnd))
  }, [reducedMotion])

  useEffect(() => () => {
    timeline.current?.kill()
  }, [])

  return { phase, timelineState, start, reset }
}
