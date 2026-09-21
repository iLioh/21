import { useState } from 'react'
import { Experience } from './experience/Experience'
import { AudioControl } from './components/ui/AudioControl'
import { FinalMessage } from './components/ui/FinalMessage'
import { Intro } from './components/ui/Intro'
import { useDevicePerformance } from './hooks/useDevicePerformance'
import { useExperienceTimeline } from './hooks/useExperienceTimeline'

export default function App() {
  const profile = useDevicePerformance()
  const { phase, timelineState, start, reset } = useExperienceTimeline(profile.reducedMotion)
  const [restartToken, setRestartToken] = useState(0)
  const started = phase !== 'INTRO'

  const replay = () => {
    reset()
    setRestartToken((value) => value + 1)
  }

  return (
    <main className="experience-shell">
      <Experience timeline={timelineState} profile={profile} restartToken={restartToken} />
      <div className="film-grain" aria-hidden="true" />
      <div className="cinema-bars" aria-hidden="true" />
      <Intro visible={phase === 'INTRO'} isMobile={profile.isMobile} onStart={start} />
      <FinalMessage visible={phase === 'FINAL'} onReplay={replay} />
      <AudioControl started={started} restartToken={restartToken} />
      {started && phase !== 'FINAL' && (
        <div className="journey-indicator" aria-hidden="true">
          <span />
        </div>
      )}
      <p className="reduced-motion-note" aria-live="polite">
        {profile.reducedMotion && started ? 'Movimiento reducido activado' : ''}
      </p>
    </main>
  )
}
