import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { timelineConfig } from '../config/experience'
import type { ExperiencePhase } from '../types/experience'

export interface TimelineState {
  progress: number
  intensity: number
}

export function useExperienceTimeline(reducedMotion: boolean) {
  const [phase, setPhase] = useState<ExperiencePhase>('INTRO')
  const timelineState = useRef<TimelineState>({ progress: 0, intensity: 0 })
  const timeline = useRef<gsap.core.Timeline | null>(null)

  const reset = useCallback(() => {
    timeline.current?.kill()
    timelineState.current.progress = 0
    timelineState.current.intensity = 0
    setPhase('INTRO')
  }, [])

  const start = useCallback(() => {
    timeline.current?.kill()
    timelineState.current.progress = 0
    timelineState.current.intensity = 0
    const pace = reducedMotion ? 1.3 : 1
    const total = timelineConfig.finalEnd * pace
    const at = (seconds: number) => seconds * pace

    setPhase('ASCENDING')
    timeline.current = gsap.timeline({ defaults: { ease: 'none' } })
      .to(timelineState.current, { progress: 1, duration: total }, 0)
      // Impulso 1: despegue. Después se estabiliza en velocidad de crucero.
      .to(timelineState.current, { intensity: reducedMotion ? 0.22 : 1, duration: at(0.8), ease: 'power3.in' }, 0)
      .to(timelineState.current, { intensity: reducedMotion ? 0.12 : 0.38, duration: at(1.9), ease: 'power3.out' }, at(0.8))
      // Impulso 2: aproximación final al girasol-sol.
      .to(timelineState.current, { intensity: reducedMotion ? 0.25 : 1, duration: at(0.45), ease: 'power3.in' }, at(10.15))
      .to(timelineState.current, { intensity: reducedMotion ? 0.06 : 0.12, duration: at(1.8), ease: 'power4.out' }, at(10.6))
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
